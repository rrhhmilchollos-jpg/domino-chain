const router = require('express').Router();
const User = require('../models/User');
const Video = require('../models/Video');

router.get('/', async (req, res) => {
  try {
    const { period = 'week', limit = 50 } = req.query;
    const users = await User.find({ isActive: true })
      .select('-password -pushSubscription -email -savedVideos')
      .sort({ impactPoints: -1 }).limit(Number(limit));
    const ranking = users.map((u, i) => ({ ...u.toObject(), position: i + 1 }));
    res.json(ranking);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/trending', async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 3600000);
    const videos = await Video.find({ isPublished: true, createdAt: { $gte: since } })
      .populate('userId', 'username avatarUrl flag isVerified impactPoints')
      .populate('challengeId', 'title category')
      .sort({ views: -1, likes: -1 }).limit(20);
    res.json(videos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
