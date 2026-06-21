const router = require('express').Router();
const optionalAuth = require('../middleware/optionalAuth');
const User = require('../models/User');
const Video = require('../models/Video');
const Challenge = require('../models/Challenge');

// Marca isSaved en cada video según quién pregunta (mismo patrón que en videos.js)
async function withIsSaved(videos, requester) {
  const SavedVideo = require('../models/SavedVideo');
  if (!requester || videos.length === 0) return videos.map(v => ({ ...v.toObject(), isSaved: false }));
  const ids = videos.map(v => v._id);
  const mySaves = await SavedVideo.find({ userId: requester._id, videoId: { $in: ids } }).select('videoId');
  const savedSet = new Set(mySaves.map(s => s.videoId.toString()));
  return videos.map(v => ({ ...v.toObject(), isSaved: savedSet.has(v._id.toString()) }));
}

// GET /api/search?q=... — búsqueda unificada: cuentas reales, videos
// (por leyenda o hashtag) y retos. Nunca devuelve nada inventado, todo
// sale de lo que la gente escribió de verdad.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const qRaw = (req.query.q || '').trim();
    if (qRaw.length < 2) return res.json({ users: [], videos: [], challenges: [] });

    const isHashtagSearch = qRaw.startsWith('#');
    const tag = qRaw.replace(/^#/, '').toLowerCase();

    const [users, videoPool, challenges] = await Promise.all([
      isHashtagSearch ? Promise.resolve([]) : User.find({
        $or: [
          { username: { $regex: qRaw, $options: 'i' } },
          { country: { $regex: qRaw, $options: 'i' } },
          { city: { $regex: qRaw, $options: 'i' } }
        ]
      }).select('-password -pushSubscription -email').limit(20),

      isHashtagSearch
        ? Video.find({ hashtags: tag, isPublished: true, isPublic: { $ne: false }, videoUrl: { $ne: '' } })
            .populate('userId', 'username avatarUrl country city flag')
            .sort({ createdAt: -1 }).limit(30)
        : Video.find({
            $or: [
              { caption: { $regex: qRaw, $options: 'i' } },
              { hashtags: tag }
            ],
            isPublished: true, isPublic: { $ne: false }, videoUrl: { $ne: '' }
          }).populate('userId', 'username avatarUrl country city flag').sort({ createdAt: -1 }).limit(30),

      isHashtagSearch ? Promise.resolve([]) : Challenge.find({ title: { $regex: qRaw, $options: 'i' } }).sort({ activatedAt: -1 }).limit(10)
    ]);

    res.json({ users, videos: await withIsSaved(videoPool, req.user), challenges });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/search/hashtags/top — hashtags reales más usados ahora mismo
// (agregación sobre los propios videos publicados, nada hardcodeado).
router.get('/hashtags/top', async (req, res) => {
  try {
    const limit = Math.min(20, Number(req.query.limit) || 12);
    const top = await Video.aggregate([
      { $match: { isPublished: true, isPublic: { $ne: false }, hashtags: { $exists: true, $ne: [] } } },
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);
    res.json(top.map(t => ({ tag: t._id, count: t.count })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
