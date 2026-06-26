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

router.post('/push-subscription', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: req.body });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
