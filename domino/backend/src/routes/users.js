const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Video = require('../models/Video');
const Notification = require('../models/Notification');

router.get('/me', auth, (req, res) => res.json(req.user));

router.put('/me', auth, async (req, res) => {
  try {
    const { username, bio, country, city, flag, avatarUrl, coverUrl, website, lat, lng } = req.body;
    const update = {};
    if (username !== undefined) update.username = username;
    if (bio !== undefined) update.bio = bio;
    if (country !== undefined) update.country = country;
    if (city !== undefined) update.city = city;
    if (flag !== undefined) update.flag = flag;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    if (coverUrl !== undefined) update.coverUrl = coverUrl;
    if (website !== undefined) update.website = website;
    if (lat !== undefined) update.lat = lat;
    if (lng !== undefined) update.lng = lng;
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-password');
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/search', async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;
    if (!q.trim()) return res.json([]);
    const users = await User.find({ username: { $regex: q, $options: 'i' }, isActive: true })
      .select('-password -pushSubscription -email').limit(Number(limit));
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -pushSubscription');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const videoCount = await Video.countDocuments({ userId: req.params.id, isPublished: true });
    res.json({ ...user.toObject(), videoCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/videos', async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const videos = await Video.find({ userId: req.params.id, isPublished: true })
      .populate('userId', 'username avatarUrl flag')
      .populate('challengeId', 'title category')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit));
    res.json(videos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users/:id/follow
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === String(req.user._id)) return res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    const isFollowing = target.followers.includes(req.user._id);
    if (isFollowing) {
      await User.findByIdAndUpdate(targetId, { $pull: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: targetId } });
    } else {
      await User.findByIdAndUpdate(targetId, { $addToSet: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: targetId } });
      await Notification.create({ userId: targetId, type: 'followed', fromUserId: req.user._id, message: `${req.user.username} ha empezado a seguirte` });
    }
    const updated = await User.findById(targetId).select('followers following');
    res.json({ following: !isFollowing, followersCount: updated.followers.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/followers', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('followers', 'username avatarUrl flag impactPoints');
    res.json(user?.followers || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/following', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('following', 'username avatarUrl flag impactPoints');
    res.json(user?.following || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users/admin/fix-email-usernames — corregir usernames que son emails (solo admin o con secret)
router.post('/admin/fix-email-usernames', async (req, res) => {
  try {
    const { secret } = req.body;
    if (secret !== (process.env.ADMIN_SECRET || 'domino-admin-2024')) return res.status(403).json({ error: 'No autorizado' });
    // Buscar usuarios cuyo username contiene @ (es un email)
    const users = await User.find({ username: { $regex: '@' } });
    const fixed = [];
    for (const u of users) {
      const baseUsername = u.username.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 20) || 'user';
      let newUsername = baseUsername;
      let counter = 1;
      while (await User.findOne({ username: newUsername, _id: { $ne: u._id } })) {
        newUsername = `${baseUsername}${counter++}`;
      }
      await User.findByIdAndUpdate(u._id, { username: newUsername });
      fixed.push({ id: u._id, old: u.username, new: newUsername });
    }
    res.json({ fixed, count: fixed.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/me/username — cambiar username (con validación)
router.put('/me/username', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.length < 3 || username.length > 30) return res.status(400).json({ error: 'Username debe tener entre 3 y 30 caracteres' });
    if (username.includes('@')) return res.status(400).json({ error: 'El username no puede contener @' });
    if (!/^[a-zA-Z0-9_\.]+$/.test(username)) return res.status(400).json({ error: 'Username solo puede contener letras, números, _ y .' });
    const exists = await User.findOne({ username, _id: { $ne: req.user._id } });
    if (exists) return res.status(409).json({ error: 'Este username ya está en uso' });
    const user = await User.findByIdAndUpdate(req.user._id, { username }, { new: true }).select('-password');
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/push-subscription', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: req.body });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
