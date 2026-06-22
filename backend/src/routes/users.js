const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Video = require('../models/Video');
const Message = require('../models/Message');

// GET /api/users/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -pushSubscription')
      .populate('savedVideos', '_id thumbnailUrl videoUrl likes createdAt chainDepth')
      .populate('likedVideos', '_id thumbnailUrl videoUrl likes createdAt chainDepth');
    res.json(user);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/me
router.put('/me', auth, async (req, res) => {
  try {
    const { username, bio, country, city, flag, avatarUrl } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { username, bio, country, city, flag, avatarUrl }, { new: true }).select('-password');
    res.json(user);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/search?q=
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const users = await User.find({
      $or: [{ username: { $regex: q, $options: 'i' } }, { country: { $regex: q, $options: 'i' } }, { city: { $regex: q, $options: 'i' } }]
    }).select('-password -pushSubscription -email').limit(20);
    res.json(users);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users/:id/follow — seguir/dejar de seguir
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user._id.toString()) return res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    const isFollowing = target.followers.includes(req.user._id);
    if (isFollowing) {
      await User.findByIdAndUpdate(targetId, { $pull: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: targetId } });
    } else {
      await User.findByIdAndUpdate(targetId, { $addToSet: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: targetId } });
    }
    res.json({ following: !isFollowing, followerCount: target.followers.length + (isFollowing ? -1 : 1) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users/videos/:videoId/save — guardar/desguardar video
router.post('/videos/:videoId/save', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const saved = user.savedVideos.includes(req.params.videoId);
    if (saved) await User.findByIdAndUpdate(req.user._id, { $pull: { savedVideos: req.params.videoId } });
    else await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedVideos: req.params.videoId } });
    res.json({ saved: !saved });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/:id/videos — videos de un usuario
router.get('/:id/videos', async (req, res) => {
  try {
    const videos = await Video.find({ userId: req.params.id, isPublished: true })
      .sort({ createdAt: -1 }).limit(30)
      .populate('userId', 'username avatarUrl flag');
    res.json(videos);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/:id — perfil público
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -pushSubscription -email');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ===================== MENSAJES =====================

// GET /api/users/messages/inbox — lista de conversaciones
router.get('/messages/inbox', auth, async (req, res) => {
  try {
    // Obtener últimos mensajes agrupados por conversación
    const messages = await Message.find({
      $or: [{ fromUserId: req.user._id }, { toUserId: req.user._id }]
    })
      .sort({ createdAt: -1 })
      .populate('fromUserId', 'username avatarUrl flag')
      .populate('toUserId', 'username avatarUrl flag')
      .limit(50);

    // Agrupar por conversación (par de usuarios)
    const conversations: Record<string, any> = {};
    messages.forEach((m: any) => {
      const otherId = m.fromUserId._id.toString() === req.user._id.toString()
        ? m.toUserId._id.toString() : m.fromUserId._id.toString();
      if (!conversations[otherId]) {
        conversations[otherId] = {
          user: m.fromUserId._id.toString() === req.user._id.toString() ? m.toUserId : m.fromUserId,
          lastMessage: m,
          unread: 0
        };
      }
      if (!m.read && m.toUserId._id.toString() === req.user._id.toString()) {
        conversations[otherId].unread++;
      }
    });

    res.json(Object.values(conversations));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/users/messages/:userId — mensajes con un usuario
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { fromUserId: req.user._id, toUserId: req.params.userId },
        { fromUserId: req.params.userId, toUserId: req.user._id }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('fromUserId', 'username avatarUrl flag')
      .populate('toUserId', 'username avatarUrl flag')
      .limit(100);
    // Marcar como leídos
    await Message.updateMany({ fromUserId: req.params.userId, toUserId: req.user._id, read: false }, { read: true });
    res.json(messages);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users/messages/:userId — enviar mensaje
router.post('/messages/:userId', auth, async (req, res) => {
  try {
    const { text, videoRef } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Mensaje vacío' });
    const msg = await Message.create({ fromUserId: req.user._id, toUserId: req.params.userId, text: text.trim(), videoRef: videoRef || null });
    await msg.populate('fromUserId', 'username avatarUrl flag');
    res.status(201).json(msg);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users/push-subscription
router.post('/push-subscription', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: req.body });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
