const router = require('express').Router();
const auth = require('../middleware/auth');
const Live = require('../models/Live');
const Gift = require('../models/Gift');
const Video = require('../models/Video');

let AccessToken, EgressClient, EncodedFileOutput, EncodedFileType, DirectFileOutput;
try {
  const livekit = require('livekit-server-sdk');
  AccessToken = livekit.AccessToken;
  EgressClient = livekit.EgressClient;
  EncodedFileOutput = livekit.EncodedFileOutput;
  EncodedFileType = livekit.EncodedFileType;
  DirectFileOutput = livekit.DirectFileOutput;
} catch (e) {
  console.warn('livekit-server-sdk no instalado — lives desactivados');
}

let cloudinary = null;
try {
  const { v2 } = require('cloudinary');
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    cloudinary = v2;
    console.log('✅ Cloudinary configurado para grabaciones de directos');
  }
} catch (e) {
  console.warn('cloudinary no disponible:', e.message);
}

function generateRoomName(userId) {
  return `domino-live-${userId}-${Date.now()}`;
}

async function generateLivekitToken(roomName, userId, username, isHost = false) {
  if (!AccessToken) return null;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) return null;
  const at = new AccessToken(apiKey, apiSecret, { identity: userId, name: username });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: isHost,
    canSubscribe: true,
    canPublishData: true
  });
  return await at.toJwt();
}

function getLivekitUrl() {
  return process.env.LIVEKIT_URL || null;
}

const fs = require('fs');
const path = require('path');

function recordingConfigured() {
  return !!(EgressClient && cloudinary && process.env.LIVEKIT_API_KEY);
}

function getEgressClient() {
  const url = getLivekitUrl();
  if (!EgressClient || !url) return null;
  const host = url.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
  return new EgressClient(host, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
}

const egressFiles = {};

async function startRecording(roomName) {
  if (!recordingConfigured()) return null;
  const client = getEgressClient();
  if (!client) return null;
  try {
    const tmpPath = `/tmp/${roomName}-${Date.now()}.mp4`;
    const output = new EncodedFileOutput({
      fileType: EncodedFileType ? EncodedFileType.MP4 : 1,
      filepath: tmpPath,
    });
    const info = await client.startRoomCompositeEgress(roomName, { file: output });
    egressFiles[info.egressId] = tmpPath;
    console.log(`🎙️ Grabación iniciada: ${info.egressId} → ${tmpPath}`);
    return info.egressId;
  } catch (e) {
    console.error('No se pudo iniciar la grabación del live:', e.message);
    return null;
  }
}

async function stopRecording(egressId) {
  const client = getEgressClient();
  if (!client || !egressId) return null;
  try {
    await client.stopEgress(egressId);
  } catch (e) {
    console.error('Error al detener egress:', e.message);
  }
  await new Promise(r => setTimeout(r, 4000));
  const tmpPath = egressFiles[egressId];
  if (!tmpPath || !fs.existsSync(tmpPath)) {
    console.warn('Fichero de grabación no encontrado:', tmpPath);
    return null;
  }
  try {
    console.log(`☁️ Subiendo grabación a Cloudinary: ${tmpPath}`);
    const result = await cloudinary.uploader.upload(tmpPath, {
      resource_type: 'video',
      folder: 'domino-lives',
      public_id: `live-${egressId}`,
      overwrite: true,
    });
    try { fs.unlinkSync(tmpPath); } catch {}
    delete egressFiles[egressId];
    console.log(`✅ Grabación subida: ${result.secure_url}`);
    return result.secure_url;
  } catch (e) {
    console.error('Error al subir grabación a Cloudinary:', e.message);
    return null;
  }
}

// GET /api/lives
router.get('/', async (req, res) => {
  try {
    const lives = await Live.find({ status: 'active' })
      .populate('userId', 'username avatarUrl flag country city impactPoints')
      .populate('battleOpponentId', 'username avatarUrl flag')
      .sort({ viewerCount: -1, createdAt: -1 })
      .limit(20);
    res.json(lives);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, isBattle } = req.body;
    if (!title) return res.status(400).json({ error: 'Título requerido' });
    await Live.updateMany(
      { userId: req.user._id, status: 'active' },
      { status: 'ended', endedAt: new Date() }
    );
    const roomName = generateRoomName(req.user._id);
    const token = await generateLivekitToken(roomName, req.user._id.toString(), req.user.username, true);
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
    const egressId = await startRecording(roomName);
    if (egressId) await Live.findByIdAndUpdate(live._id, { egressId });
    await live.populate('userId', 'username avatarUrl flag');
    res.status(201).json({ live, token, roomName, livekitUrl: getLivekitUrl(), recording: !!egressId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/join
router.post('/:id/join', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id)
      .populate('userId', 'username avatarUrl flag')
      .populate('battleOpponentId', 'username avatarUrl flag');
    if (!live || live.status !== 'active') return res.status(404).json({ error: 'Live no encontrado o terminado' });

    // Comprobar si el usuario está bloqueado
    if (live.blockedUserIds && live.blockedUserIds.map(id => id.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ error: 'blocked' });
    }

    const isHost = live.userId._id.toString() === req.user._id.toString();
    const isOpponent = !!live.battleOpponentId && live.battleOpponentId._id.toString() === req.user._id.toString();
    const token = await generateLivekitToken(live.roomName, req.user._id.toString(), req.user.username, isHost || isOpponent);

    if (!isHost && !isOpponent) {
      const updated = await Live.findByIdAndUpdate(live._id, {
        $inc: { viewerCount: 1 },
        $addToSet: { viewerIds: req.user._id }
      }, { new: true });
      if (updated.viewerCount > updated.peakViewerCount) {
        await Live.findByIdAndUpdate(live._id, { peakViewerCount: updated.viewerCount });
      }
    }

    res.json({ live, token, roomName: live.roomName, livekitUrl: getLivekitUrl(), isHost, isOpponent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/leave
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id);
    if (live && live.viewerCount > 0) await Live.findByIdAndUpdate(req.params.id, { $inc: { viewerCount: -1 } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/request — espectador solicita unirse al live
router.post('/:id/request', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id).populate('userId', 'username');
    if (!live || live.status !== 'active') return res.status(404).json({ error: 'Live no encontrado' });
    if (live.userId._id.toString() === req.user._id.toString()) return res.status(400).json({ error: 'Eres el host' });

    const Notification = require('../models/Notification');
    const existing = await Notification.findOne({
      userId: live.userId._id,
      type: 'join_request',
      fromUserId: req.user._id,
      liveId: live._id,
      read: false
    });
    if (existing) return res.status(409).json({ error: 'Ya tienes una solicitud pendiente' });

    await Notification.create({
      userId: live.userId._id,
      type: 'join_request',
      fromUserId: req.user._id,
      liveId: live._id,
      message: `${req.user.username} quiere unirse a tu directo`,
    });

    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/lives/:id/requests — host ve solicitudes pendientes
router.get('/:id/requests', auth, async (req, res) => {
  try {
    const live = await Live.findOne({ _id: req.params.id, userId: req.user._id });
    if (!live) return res.status(403).json({ error: 'No eres el host' });

    const Notification = require('../models/Notification');
    const requests = await Notification.find({
      userId: req.user._id,
      type: 'join_request',
      liveId: live._id,
      read: false
    }).populate('fromUserId', 'username avatarUrl flag');

    res.json(requests);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/request/:userId/accept — host acepta solicitud
router.post('/:id/request/:userId/accept', auth, async (req, res) => {
  try {
    const live = await Live.findOne({ _id: req.params.id, userId: req.user._id, status: 'active' });
    if (!live) return res.status(404).json({ error: 'Live no encontrado o no eres el host' });
    if (live.battleOpponentId) return res.status(409).json({ error: 'Ya hay un co-host en este live' });

    live.battleOpponentId = req.params.userId;
    await live.save();

    const Notification = require('../models/Notification');
    await Notification.create({
      userId: req.params.userId,
      type: 'join_accepted',
      fromUserId: req.user._id,
      liveId: live._id,
      message: `${req.user.username} aceptó tu solicitud — ¡ya puedes entrar al directo!`,
    });
    await Notification.updateMany(
      { userId: req.user._id, type: 'join_request', fromUserId: req.params.userId, liveId: live._id },
      { read: true }
    );

    await live.populate('userId', 'username avatarUrl flag');
    await live.populate('battleOpponentId', 'username avatarUrl flag');
    res.json({ ok: true, live });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/request/:userId/reject — host rechaza solicitud
router.post('/:id/request/:userId/reject', auth, async (req, res) => {
  try {
    const live = await Live.findOne({ _id: req.params.id, userId: req.user._id });
    if (!live) return res.status(404).json({ error: 'Live no encontrado' });

    const Notification = require('../models/Notification');
    await Notification.create({
      userId: req.params.userId,
      type: 'join_rejected',
      fromUserId: req.user._id,
      liveId: live._id,
      message: `${req.user.username} no aceptó tu solicitud de unirte al directo`,
    });
    await Notification.updateMany(
      { userId: req.user._id, type: 'join_request', fromUserId: req.params.userId, liveId: live._id },
      { read: true }
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/battle/invite
router.post('/:id/battle/invite', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Falta userId del rival a invitar' });
    if (userId === req.user._id.toString()) return res.status(400).json({ error: 'No puedes invitarte a ti mismo' });

    const live = await Live.findOne({ _id: req.params.id, userId: req.user._id, status: 'active' });
    if (!live) return res.status(404).json({ error: 'Live no encontrado' });

    const Notification = require('../models/Notification');
    await Notification.create({
      userId,
      type: 'battle_invite',
      fromUserId: req.user._id,
      liveId: live._id,
      message: `${req.user.username} te ha retado a una batalla DOMINO 🥊`,
    });

    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/battle/accept
router.post('/:id/battle/accept', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id);
    if (!live || live.status !== 'active') return res.status(404).json({ error: 'Live no encontrado o terminado' });
    if (!live.isBattle) return res.status(400).json({ error: 'Este live no está en modo batalla' });
    if (live.userId.toString() === req.user._id.toString()) return res.status(400).json({ error: 'No puedes ser rival de tu propio live' });
    if (live.battleOpponentId && live.battleOpponentId.toString() !== req.user._id.toString()) {
      return res.status(409).json({ error: 'Esta batalla ya tiene rival' });
    }

    live.battleOpponentId = req.user._id;
    await live.save();
    await live.populate('userId', 'username avatarUrl flag');
    await live.populate('battleOpponentId', 'username avatarUrl flag');

    res.json({ ok: true, live });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/battle/decline
router.post('/:id/battle/decline', auth, async (req, res) => {
  res.json({ ok: true });
});

// POST /api/lives/:id/block — bloquear espectador
router.post('/:id/block', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const live = await Live.findOne({ _id: req.params.id, userId: req.user._id, status: 'active' });
    if (!live) return res.status(404).json({ error: 'Live no encontrado' });

    await Live.findByIdAndUpdate(live._id, { $addToSet: { blockedUserIds: userId } });

    // Intentar expulsar de la sala LiveKit
    try {
      const lkUrl = getLivekitUrl()?.replace(/^wss?:\/\//, 'https://');
      if (lkUrl && AccessToken) {
        const { RoomServiceClient } = require('livekit-server-sdk');
        const svc = new RoomServiceClient(lkUrl, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
        await svc.removeParticipant(live.roomName, userId);
      }
    } catch { /* silencioso */ }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/lives/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const live = await Live.findOne({ _id: req.params.id, userId: req.user._id });
    if (!live) return res.status(404).json({ error: 'Live no encontrado' });

    let recordingUrl = '';
    if (live.egressId) {
      recordingUrl = (await stopRecording(live.egressId)) || '';
    }

    live.status = 'ended';
    live.endedAt = new Date();
    if (recordingUrl) live.recordingUrl = recordingUrl;
    await live.save();

    res.json({
      ok: true,
      summary: {
        totalUniqueViewers: live.viewerIds.length,
        peakViewerCount: live.peakViewerCount,
        totalGiftsReceived: live.totalGiftsReceived,
        durationSeconds: Math.round((live.endedAt - live.createdAt) / 1000),
      },
      recordingUrl: live.recordingUrl || null,
      liveId: live._id,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/publish-as-video
router.post('/:id/publish-as-video', auth, async (req, res) => {
  try {
    const live = await Live.findOne({ _id: req.params.id, userId: req.user._id });
    if (!live) return res.status(404).json({ error: 'Live no encontrado' });
    if (!live.recordingUrl) return res.status(400).json({ error: 'Este live no tiene ninguna grabación disponible' });
    if (live.publishedAsVideoId) return res.status(409).json({ error: 'Este live ya se publicó como video' });

    const video = await Video.create({
      userId: req.user._id,
      videoUrl: live.recordingUrl,
      thumbnailUrl: live.thumbnailUrl || '',
      geoCoordinates: { lat: 0, lng: 0 },
      isPublished: true,
    });

    live.publishedAsVideoId = video._id;
    await live.save();

    res.status(201).json({ ok: true, video });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/lives/:id/recording
router.patch('/:id/recording', auth, async (req, res) => {
  try {
    const { recordingUrl } = req.body;
    await Live.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { recordingUrl });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/lives/catalog/gifts
router.get('/catalog/gifts', (req, res) => {
  res.json(Gift.CATALOG || {
    domino:  { name: 'Dominó',   emoji: '🎲', coins: 5,    points: 10   },
    chain:   { name: 'Cadena',   emoji: '⛓️', coins: 20,   points: 50   },
    star:    { name: 'Estrella', emoji: '⭐', coins: 50,   points: 100  },
    rocket:  { name: 'Cohete',   emoji: '🚀', coins: 100,  points: 200  },
    crown:   { name: 'Corona',   emoji: '👑', coins: 500,  points: 1000 },
    diamond: { name: 'Diamante', emoji: '💎', coins: 1000, points: 2500 }
  });
});

// POST /api/lives/:id/gift — DEPRECATED
router.post('/:id/gift', auth, async (req, res) => {
  res.status(410).json({ error: 'Usa POST /api/coins/gift' });
});

module.exports = router;
