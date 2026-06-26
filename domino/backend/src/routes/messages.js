const router = require('express').Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

// GET /api/messages/conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const msgs = await Message.find({ $or: [{ fromUserId: userId }, { toUserId: userId }] })
      .sort({ createdAt: -1 });
    const convMap = new Map();
    for (const m of msgs) {
      const otherId = String(m.fromUserId) === String(userId) ? String(m.toUserId) : String(m.fromUserId);
      if (!convMap.has(otherId)) convMap.set(otherId, m);
    }
    const convs = [];
    for (const [otherId, lastMsg] of convMap) {
      const other = await User.findById(otherId).select('username avatarUrl flag isVerified');
      const unread = await Message.countDocuments({ fromUserId: otherId, toUserId: userId, read: false });
      if (other) convs.push({ user: other, lastMessage: lastMsg, unread });
    }
    res.json(convs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/messages/:userId
router.get('/:userId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const msgs = await Message.find({
      $or: [
        { fromUserId: req.user._id, toUserId: req.params.userId },
        { fromUserId: req.params.userId, toUserId: req.user._id }
      ]
    }).populate('fromUserId', 'username avatarUrl flag')
      .populate('toUserId', 'username avatarUrl flag')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    await Message.updateMany({ fromUserId: req.params.userId, toUserId: req.user._id, read: false }, { read: true });
    res.json(msgs.reverse());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/messages/:userId
router.post('/:userId', auth, async (req, res) => {
  try {
    const { text, videoId, imageUrl } = req.body;
    if (!text?.trim() && !videoId && !imageUrl) return res.status(400).json({ error: 'Mensaje vacío' });
    const msg = await Message.create({
      fromUserId: req.user._id, toUserId: req.params.userId,
      text: text?.trim() || '', videoId: videoId || null, imageUrl: imageUrl || ''
    });
    const populated = await Message.findById(msg._id)
      .populate('fromUserId', 'username avatarUrl flag')
      .populate('toUserId', 'username avatarUrl flag');
    // Emitir por socket si está disponible
    if (req.app.get('io')) {
      req.app.get('io').to(req.params.userId).emit('new_message', populated);
    }
    res.status(201).json(populated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
