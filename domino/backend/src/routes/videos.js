const router = require('express').Router();
const auth = require('../middleware/auth');
const Video = require('../models/Video');
const Challenge = require('../models/Challenge');
const Notification = require('../models/Notification');
const User = require('../models/User');

// GET /api/videos/feed
router.get('/feed', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const videos = await Video.find({ isPublished: true })
      .populate('userId', 'username avatarUrl country city flag impactPoints currentStreak')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json(videos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/videos/chain/:rootId
router.get('/chain/:rootId', async (req, res) => {
  try {
    const chain = await Video.find({ rootVideoId: req.params.rootId, isPublished: true })
      .populate('userId', 'username avatarUrl country city flag')
      .sort({ chainDepth: 1 });
    res.json(chain);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/videos — publicar video
router.post('/', auth, async (req, res) => {
  try {
    const { challengeId, thumbnailUrl, parentVideoId, geoCoordinates, nominatedUserIds } = req.body;
    if (!challengeId || !geoCoordinates || !nominatedUserIds || nominatedUserIds.length !== 3) {
      return res.status(400).json({ error: 'Faltan campos obligatorios o no has nominado 3 personas' });
    }

    let chainDepth = 0;
    let rootVideoId = null;

    if (parentVideoId) {
      const parent = await Video.findById(parentVideoId);
      if (!parent) return res.status(404).json({ error: 'Video padre no encontrado' });
      chainDepth = parent.chainDepth + 1;
      rootVideoId = parent.rootVideoId;
    }

    const video = await Video.create({
      challengeId, userId: req.user._id, thumbnailUrl: thumbnailUrl || '',
      parentVideoId: parentVideoId || null,
      rootVideoId, geoCoordinates, nominatedUsers: nominatedUserIds,
      chainDepth, isPublished: true
    });

    if (!rootVideoId) await Video.findByIdAndUpdate(video._id, { rootVideoId: video._id });

    // Incrementar contador del reto
    await Challenge.findByIdAndUpdate(challengeId, { $inc: { globalCounter: 1 } });

    // Sumar puntos al usuario
    await User.findByIdAndUpdate(req.user._id, { $inc: { impactPoints: 100 + chainDepth * 50 } });

    // Crear notificaciones para los nominados
    const msgs = nominatedUserIds.map(uid => ({
      userId: uid, type: 'nomination', fromUserId: req.user._id,
      videoId: video._id, chainId: video.rootVideoId || video._id,
      message: `${req.user.username} te ha nominado para continuar la cadena`
    }));
    await Notification.insertMany(msgs);

    res.status(201).json(video);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/videos/:id/like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video no encontrado' });
    const liked = video.likes.includes(req.user._id);
    if (liked) video.likes.pull(req.user._id);
    else video.likes.push(req.user._id);
    await video.save();
    res.json({ liked: !liked, count: video.likes.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
