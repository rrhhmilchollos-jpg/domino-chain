const router = require('express').Router();
const auth = require('../middleware/auth');
const Live = require('../models/Live');
const Gift = require('../models/Gift');
const Notification = require('../models/Notification');
const User = require('../models/User');

const GIFT_CATALOG = {
  domino:  { coins: 5,    points: 10   },
  chain:   { coins: 20,   points: 50   },
  star:    { coins: 50,   points: 100  },
  rocket:  { coins: 100,  points: 200  },
  crown:   { coins: 500,  points: 1000 },
  diamond: { coins: 1000, points: 2500 },
  fire:    { coins: 10,   points: 25   },
  heart:   { coins: 15,   points: 30   },
  bomb:    { coins: 200,  points: 400  },
  galaxy:  { coins: 2000, points: 5000 },
};

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
      .populate('userId', 'username avatarUrl flag isVerified impactPoints city country followers coins isBot');
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

// POST /api/lives
router.post('/', auth, async (req, res) => {
  try {
    const { title, thumbnailUrl } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'El título es obligatorio' });
    await Live.updateMany({ userId: req.user._id, isActive: true }, { isActive: false, endedAt: new Date() });
    const live = await Live.create({
      userId: req.user._id, title: title.trim(),
      thumbnailUrl: thumbnailUrl || '',
      roomId: `domino-live-${req.user._id}-${Date.now()}`
    });
    const me = await User.findById(req.user._id).select('followers username');
    if (me?.followers?.length > 0) {
      const notifs = me.followers.slice(0, 100).map(fId => ({
        userId: fId, type: 'live_started', fromUserId: req.user._id,
        message: `${me.username} ha empezado un directo: "${title.trim()}"`
      }));
      await Notification.insertMany(notifs);
    }
    res.status(201).json(live);
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

// PUT /api/lives/:id/join
router.put('/:id/join', async (req, res) => {
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
