const router = require('express').Router();
const auth = require('../middleware/auth');
const Live = require('../models/Live');
const Gift = require('../models/Gift');
const User = require('../models/User');
const Notification = require('../models/Notification');

// LiveKit token generation
// npm install livekit-server-sdk
let AccessToken;
try {
  const livekit = require('livekit-server-sdk');
  AccessToken = livekit.AccessToken;
} catch (e) {
  console.warn('livekit-server-sdk no instalado — lives desactivados');
}

function generateRoomName(userId) {
  return `domino-live-${userId}-${Date.now()}`;
}

function generateLivekitToken(roomName, userId, username, isHost = false) {
  if (!AccessToken) return null;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) return null;

  const at = new AccessToken(apiKey, apiSecret, { identity: userId, name: username });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: isHost,      // solo el host publica video/audio
    canSubscribe: true,      // todos pueden ver
    canPublishData: true     // todos pueden enviar mensajes de chat
  });
  return at.toJwt();
}

// GET /api/lives — lives activos
router.get('/', async (req, res) => {
  try {
    const lives = await Live.find({ status: 'active' })
      .populate('userId', 'username avatarUrl flag country city impactPoints')
      .sort({ viewerCount: -1, createdAt: -1 })
      .limit(20);
    res.json(lives);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives — crear live
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, isBattle } = req.body;
    if (!title) return res.status(400).json({ error: 'Título requerido' });

    // Terminar lives anteriores del usuario
    await Live.updateMany(
      { userId: req.user._id, status: 'active' },
      { status: 'ended', endedAt: new Date() }
    );

    const roomName = generateRoomName(req.user._id);
    const token = generateLivekitToken(roomName, req.user._id.toString(), req.user.username, true);

    const live = await Live.create({
      userId: req.user._id,
      title,
      description: description || '',
      roomName,
      livekitToken: token,
      category: category || 'General',
      isBattle: isBattle || false,
      status: 'active'
    });

    await live.populate('userId', 'username avatarUrl flag');

    res.status(201).json({ live, token, roomName, livekitUrl: process.env.LIVEKIT_URL || 'wss://your-livekit-server.com' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/join — unirse como espectador
router.post('/:id/join', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id).populate('userId', 'username avatarUrl flag');
    if (!live || live.status !== 'active') return res.status(404).json({ error: 'Live no encontrado o terminado' });

    const token = generateLivekitToken(live.roomName, req.user._id.toString(), req.user.username, false);

    // Incrementar contador de espectadores
    await Live.findByIdAndUpdate(live._id, {
      $inc: { viewerCount: 1 },
      $max: { peakViewerCount: live.viewerCount + 1 }
    });

    res.json({ live, token, roomName: live.roomName, livekitUrl: process.env.LIVEKIT_URL || 'wss://your-livekit-server.com' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/leave
router.post('/:id/leave', auth, async (req, res) => {
  try {
    await Live.findByIdAndUpdate(req.params.id, { $inc: { viewerCount: -1 } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/lives/:id — terminar live
router.delete('/:id', auth, async (req, res) => {
  try {
    const live = await Live.findOne({ _id: req.params.id, userId: req.user._id });
    if (!live) return res.status(404).json({ error: 'Live no encontrado' });
    live.status = 'ended';
    live.endedAt = new Date();
    await live.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/lives/catalog — catálogo de regalos
router.get('/catalog/gifts', (req, res) => {
  res.json(Gift.CATALOG || {
    domino:  { name: 'Dominó',   emoji: '🁣', coins: 5,    points: 10   },
    chain:   { name: 'Cadena',   emoji: '⛓️', coins: 20,   points: 50   },
    star:    { name: 'Estrella', emoji: '⭐', coins: 50,   points: 100  },
    rocket:  { name: 'Cohete',   emoji: '🚀', coins: 100,  points: 200  },
    crown:   { name: 'Corona',   emoji: '👑', coins: 500,  points: 1000 },
    diamond: { name: 'Diamante', emoji: '💎', coins: 1000, points: 2500 }
  });
});

// POST /api/lives/:id/gift — enviar regalo
router.post('/:id/gift', auth, async (req, res) => {
  try {
    const { giftType, quantity = 1 } = req.body;
    const live = await Live.findById(req.params.id).populate('userId');
    if (!live || live.status !== 'active') return res.status(404).json({ error: 'Live no encontrado' });

    const catalog = Gift.CATALOG || {
      domino: { coins: 5, points: 10 }, chain: { coins: 20, points: 50 },
      star: { coins: 50, points: 100 }, rocket: { coins: 100, points: 200 },
      crown: { coins: 500, points: 1000 }, diamond: { coins: 1000, points: 2500 }
    };

    if (!catalog[giftType]) return res.status(400).json({ error: 'Tipo de regalo inválido' });

    const gift = await Gift.create({
      fromUserId: req.user._id,
      toUserId: live.userId._id,
      liveId: live._id,
      giftType,
      coins: catalog[giftType].coins * quantity,
      quantity
    });

    // Sumar puntos al streamer
    const pointsEarned = catalog[giftType].points * quantity;
    await User.findByIdAndUpdate(live.userId._id, { $inc: { impactPoints: pointsEarned } });
    await Live.findByIdAndUpdate(live._id, { $inc: { totalGiftsReceived: quantity } });

    // Si es batalla, sumar al marcador del host
    if (live.isBattle) {
      await Live.findByIdAndUpdate(live._id, { $inc: { 'battleScore.host': pointsEarned } });
    }

    // Notificación al streamer
    await Notification.create({
      userId: live.userId._id,
      type: 'liked',
      fromUserId: req.user._id,
      videoId: null,
      chainId: null,
      message: `${req.user.username} te ha enviado ${quantity}x ${catalog[giftType]?.name || giftType} 🎁`
    });

    res.status(201).json({ ok: true, gift, pointsEarned });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
