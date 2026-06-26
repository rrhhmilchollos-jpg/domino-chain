const router = require('express').Router();
const auth = require('../middleware/auth');
const Live = require('../models/Live');
const Gift = require('../models/Gift');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Video = require('../models/Video');

const GIFT_CATALOG = require('../data/giftCatalog');

// GET /api/lives
router.get('/', async (req, res) => {
  try {
    const lives = await Live.find({ isActive: true })
      .populate('userId', 'username avatarUrl flag isVerified impactPoints city country coins isBot')
      .sort({ viewerCount: -1, createdAt: -1 }).limit(20);
    res.json(lives);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/lives/:id
router.get('/:id', async (req, res) => {
  try {
    const live = await Live.findById(req.params.id)
      .populate('userId', 'username avatarUrl flag isVerified impactPoints city country followers coins isBot')
      .populate('battleOpponentId', 'username avatarUrl flag isVerified isBot');
    if (!live) return res.status(404).json({ error: 'Directo no encontrado' });
    res.json(live);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/lives/:id/gifts
router.get('/:id/gifts', async (req, res) => {
  try {
    const gifts = await Gift.find({ liveId: req.params.id })
      .populate('fromUserId', 'username avatarUrl flag isBot')
      .sort({ createdAt: -1 }).limit(50);
    res.json(gifts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/lives/:id/top-gifters
router.get('/:id/top-gifters', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const top = await Gift.aggregate([
      { $match: { liveId: new mongoose.Types.ObjectId(req.params.id) } },
      { $group: { _id: '$fromUserId', totalCoins: { $sum: '$coins' }, totalGifts: { $sum: '$quantity' } } },
      { $sort: { totalCoins: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { user: { username: 1, avatarUrl: 1, flag: 1, isBot: 1 }, totalCoins: 1, totalGifts: 1 } }
    ]);
    res.json(top);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/lives/:id/requests — peticiones de unirse al live
router.get('/:id/requests', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id);
    if (!live) return res.status(404).json({ error: 'Directo no encontrado' });
    // Devolver las peticiones pendientes almacenadas en el live
    const requests = (live.joinRequests || []).filter(r => r.status === 'pending');
    // Populate manual
    const populated = await Promise.all(requests.map(async r => {
      const u = await User.findById(r.fromUserId).select('username avatarUrl flag');
      return { _id: r._id, fromUserId: u, message: r.message || '¡Quiero unirme!', status: r.status };
    }));
    res.json(populated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/lives
router.post('/', auth, async (req, res) => {
  try {
    const { title, thumbnailUrl, description, category, isBattle } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'El título es obligatorio' });
    await Live.updateMany({ userId: req.user._id, isActive: true }, { isActive: false, endedAt: new Date() });
    const live = await Live.create({
      userId: req.user._id,
      title: title.trim(),
      description: description || '',
      category: category || 'General',
      thumbnailUrl: thumbnailUrl || '',
      roomId: `domino-live-${req.user._id}-${Date.now()}`,
      isBattle: !!isBattle,
    });
    const me = await User.findById(req.user._id).select('followers username');
    if (me?.followers?.length > 0) {
      const notifs = me.followers.slice(0, 100).map(fId => ({
        userId: fId, type: 'live_started', fromUserId: req.user._id,
        message: `${me.username} ha empezado un directo: "${title.trim()}"`
      }));
      await Notification.insertMany(notifs);
    }
    res.status(201).json({ live });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/lives/:id/gift — enviar regalo
router.post('/:id/gift', auth, async (req, res) => {
  try {
    const { giftType, quantity = 1 } = req.body;
    const giftDef = GIFT_CATALOG[giftType];
    if (!giftDef) return res.status(400).json({ error: 'Tipo de regalo inválido' });
    const live = await Live.findById(req.params.id);
    if (!live || !live.isActive) return res.status(404).json({ error: 'Directo no encontrado o inactivo' });
    const totalCost = giftDef.coins * quantity;
    const sender = await User.findById(req.user._id);
    if (!sender || sender.coins < totalCost) {
      return res.status(400).json({ error: 'Monedas insuficientes', needed: totalCost, have: sender?.coins || 0 });
    }
    await User.findByIdAndUpdate(req.user._id, { $inc: { coins: -totalCost } });
    const earnedPoints = giftDef.points * quantity;
    await User.findByIdAndUpdate(live.userId, { $inc: { impactPoints: earnedPoints, coins: Math.floor(totalCost * 0.7) } });
    await Live.findByIdAndUpdate(req.params.id, { $inc: { totalGifts: totalCost } });
    const gift = await Gift.create({
      liveId: req.params.id, fromUserId: req.user._id, toUserId: live.userId,
      giftType, coins: totalCost, points: earnedPoints, quantity, isBot: false,
    });
    const populated = await Gift.findById(gift._id).populate('fromUserId', 'username avatarUrl flag isBot');
    if (global.io) {
      global.io.to(`live:${req.params.id}`).emit('live_gift', {
        gift: populated, senderCoinsLeft: sender.coins - totalCost,
      });
    }
    res.json({ ok: true, gift: populated, coinsLeft: sender.coins - totalCost });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/lives/:id/request — pedir unirse al live
router.post('/:id/request', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id);
    if (!live || !live.isActive) return res.status(404).json({ error: 'Directo no encontrado' });
    const existing = (live.joinRequests || []).find(r => String(r.fromUserId) === String(req.user._id) && r.status === 'pending');
    if (existing) return res.json({ ok: true, requestId: existing._id });
    live.joinRequests = live.joinRequests || [];
    live.joinRequests.push({ fromUserId: req.user._id, message: req.body.message || '¡Quiero unirme!', status: 'pending' });
    await live.save();
    const newReq = live.joinRequests[live.joinRequests.length - 1];
    // Notificar al host
    if (global.io) {
      const u = await User.findById(req.user._id).select('username avatarUrl flag');
      global.io.to(`live:${req.params.id}`).emit('join_request', {
        _id: newReq._id, fromUserId: u, message: newReq.message, status: 'pending'
      });
    }
    res.json({ ok: true, requestId: newReq._id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/lives/:id/request/:userId/accept
router.post('/:id/request/:userId/accept', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id);
    if (!live) return res.status(404).json({ error: 'Directo no encontrado' });
    if (String(live.userId) !== String(req.user._id)) return res.status(403).json({ error: 'No autorizado' });
    const reqEntry = (live.joinRequests || []).find(r => String(r.fromUserId) === req.params.userId && r.status === 'pending');
    if (reqEntry) { reqEntry.status = 'accepted'; await live.save(); }
    if (global.io) {
      global.io.to(`live:${req.params.id}`).emit('join_accepted', { userId: req.params.userId, liveId: req.params.id });
    }
    await Notification.create({ userId: req.params.userId, type: 'join_accepted', fromUserId: req.user._id, liveId: req.params.id, message: 'Tu solicitud de unirte al live fue aceptada' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/lives/:id/request/:userId/reject
router.post('/:id/request/:userId/reject', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id);
    if (!live) return res.status(404).json({ error: 'Directo no encontrado' });
    if (String(live.userId) !== String(req.user._id)) return res.status(403).json({ error: 'No autorizado' });
    const reqEntry = (live.joinRequests || []).find(r => String(r.fromUserId) === req.params.userId && r.status === 'pending');
    if (reqEntry) { reqEntry.status = 'rejected'; await live.save(); }
    if (global.io) {
      global.io.to(`live:${req.params.id}`).emit('join_rejected', { userId: req.params.userId, liveId: req.params.id });
    }
    await Notification.create({ userId: req.params.userId, type: 'join_rejected', fromUserId: req.user._id, liveId: req.params.id, message: 'Tu solicitud de unirte al live fue rechazada' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/lives/:id/battle/invite — invitar a rival para batalla
router.post('/:id/battle/invite', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const live = await Live.findById(req.params.id);
    if (!live) return res.status(404).json({ error: 'Directo no encontrado' });
    if (String(live.userId) !== String(req.user._id)) return res.status(403).json({ error: 'No autorizado' });
    await Live.findByIdAndUpdate(req.params.id, { battleOpponentId: userId, isBattle: true });
    await Notification.create({
      userId, type: 'battle_invite', fromUserId: req.user._id, liveId: req.params.id,
      message: `Te han invitado a una batalla en directo`
    });
    if (global.io) {
      global.io.to(`user:${userId}`).emit('battle_invite', { liveId: req.params.id, fromUserId: req.user._id });
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/lives/:id/block — bloquear usuario del live
router.post('/:id/block', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const live = await Live.findById(req.params.id);
    if (!live) return res.status(404).json({ error: 'Directo no encontrado' });
    if (String(live.userId) !== String(req.user._id)) return res.status(403).json({ error: 'No autorizado' });
    live.blockedUsers = live.blockedUsers || [];
    if (!live.blockedUsers.includes(userId)) { live.blockedUsers.push(userId); await live.save(); }
    if (global.io) {
      global.io.to(`live:${req.params.id}`).emit('user_blocked', { userId, liveId: req.params.id });
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/lives/:id/recording — guardar grabación del live
router.post('/:id/recording', auth, async (req, res) => {
  try {
    const { recordingUrl, duration } = req.body;
    const live = await Live.findById(req.params.id);
    if (!live) return res.status(404).json({ error: 'Directo no encontrado' });
    await Live.findByIdAndUpdate(req.params.id, { recordingUrl: recordingUrl || '', duration: duration || 0 });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/lives/:id/publish-as-video — publicar live como vídeo
router.post('/:id/publish-as-video', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id)
      .populate('userId', 'username avatarUrl flag');
    if (!live) return res.status(404).json({ error: 'Directo no encontrado' });
    if (String(live.userId._id || live.userId) !== String(req.user._id)) return res.status(403).json({ error: 'No autorizado' });
    if (!live.recordingUrl) return res.status(400).json({ error: 'No hay grabación disponible' });
    const video = await Video.create({
      userId: req.user._id,
      videoUrl: live.recordingUrl,
      thumbnailUrl: live.thumbnailUrl || '',
      caption: `🔴 Live: ${live.title}`,
      isPublic: true,
      duration: live.duration || 0,
      tags: ['live', 'domino'],
    });
    res.json({ ok: true, video });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/lives/:id/join — incrementar viewers
router.put('/:id/join', async (req, res) => {
  try {
    const live = await Live.findByIdAndUpdate(req.params.id, { $inc: { viewerCount: 1 } }, { new: true });
    if (!live) return res.status(404).json({ error: 'Directo no encontrado' });
    if (live.viewerCount > live.peakViewers) await Live.findByIdAndUpdate(req.params.id, { peakViewers: live.viewerCount });
    res.json({ viewerCount: live.viewerCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/lives/:id/join — también aceptar POST para compatibilidad
router.post('/:id/join', async (req, res) => {
  try {
    const live = await Live.findByIdAndUpdate(req.params.id, { $inc: { viewerCount: 1 } }, { new: true });
    if (!live) return res.status(404).json({ error: 'Directo no encontrado' });
    if (live.viewerCount > live.peakViewers) await Live.findByIdAndUpdate(req.params.id, { peakViewers: live.viewerCount });
    res.json({ viewerCount: live.viewerCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/lives/:id/leave
router.put('/:id/leave', async (req, res) => {
  try {
    const live = await Live.findByIdAndUpdate(req.params.id, { $inc: { viewerCount: -1 } }, { new: true });
    res.json({ viewerCount: Math.max(0, live?.viewerCount || 0) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/lives/:id/leave — también aceptar POST
router.post('/:id/leave', async (req, res) => {
  try {
    const live = await Live.findByIdAndUpdate(req.params.id, { $inc: { viewerCount: -1 } }, { new: true });
    res.json({ viewerCount: Math.max(0, live?.viewerCount || 0) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/lives/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id);
    if (!live) return res.status(404).json({ error: 'Directo no encontrado' });
    if (String(live.userId) !== String(req.user._id)) return res.status(403).json({ error: 'No autorizado' });
    await Live.findByIdAndUpdate(req.params.id, { isActive: false, endedAt: new Date() });
    if (global.io) global.io.to(`live:${req.params.id}`).emit('live_ended', { liveId: req.params.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
