const router = require('express').Router();
const auth = require('../middleware/auth');
const Video = require('../models/Video');
const Challenge = require('../models/Challenge');
const Notification = require('../models/Notification');
const Comment = require('../models/Comment');
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

// GET /api/videos/user/:userId — videos publicados por un usuario (para su dashboard/perfil)
router.get('/user/:userId', async (req, res) => {
  try {
    const videos = await Video.find({ userId: req.params.userId, isPublished: true })
      .populate('userId', 'username avatarUrl country city flag')
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/videos/liked/:userId — videos a los que el usuario ha dado 'me gusta' (pestaña Me Gusta)
router.get('/liked/:userId', async (req, res) => {
  try {
    const videos = await Video.find({ likes: req.params.userId, isPublished: true })
      .populate('userId', 'username avatarUrl country city flag')
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/videos/:id
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('userId', 'username avatarUrl country city flag impactPoints currentStreak');
    if (!video) return res.status(404).json({ error: 'Video no encontrado' });
    res.json(video);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/videos — publicar video
// BUG FIX: isPublished ahora se pone a true directamente
// BUG FIX: rootVideoId se establece atómicamente
router.post('/', auth, async (req, res) => {
  try {
    const { challengeId, videoUrl, thumbnailUrl, parentVideoId, geoCoordinates, nominatedUserIds } = req.body;
    if (!challengeId || !geoCoordinates || !nominatedUserIds || nominatedUserIds.length !== 3) {
      return res.status(400).json({ error: 'Faltan campos obligatorios o no has nominado 3 personas' });
    }

    let chainDepth = 0;
    let rootVideoId = null;

    if (parentVideoId) {
      const parent = await Video.findById(parentVideoId);
      if (!parent) return res.status(404).json({ error: 'Video padre no encontrado' });
      chainDepth = parent.chainDepth + 1;
      rootVideoId = parent.rootVideoId || parent._id;
    }

    // BUG FIX: isPublished: true directamente, sin segundo update
    const video = await Video.create({
      challengeId,
      userId: req.user._id,
      videoUrl: videoUrl || '',
      thumbnailUrl: thumbnailUrl || '',
      parentVideoId: parentVideoId || null,
      rootVideoId, // se actualiza abajo si es el root
      geoCoordinates,
      nominatedUsers: nominatedUserIds,
      chainDepth,
      isPublished: true // FIX: antes era false por el schema default
    });

    // Si es el primer video de la cadena, su rootVideoId es su propio _id
    if (!rootVideoId) {
      await Video.findByIdAndUpdate(video._id, { rootVideoId: video._id });
      video.rootVideoId = video._id;
    }

    // Incrementar contador del reto
    await Challenge.findByIdAndUpdate(challengeId, { $inc: { globalCounter: 1 } });

    // Sumar puntos al usuario
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { impactPoints: 100 + chainDepth * 50 },
      lastActiveDate: new Date()
    });

    // Crear notificaciones para los nominados
    const msgs = nominatedUserIds.map(uid => ({
      userId: uid,
      type: 'nomination',
      fromUserId: req.user._id,
      videoId: video._id,
      chainId: video.rootVideoId || video._id,
      message: `${req.user.username} te ha nominado para continuar la cadena DOMINO 🎲`
    }));
    await Notification.insertMany(msgs);

    // Notificar al padre si hay cadena
    if (parentVideoId) {
      const parentVideo = await Video.findById(parentVideoId).populate('userId');
      if (parentVideo && parentVideo.userId._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          userId: parentVideo.userId._id,
          type: 'chain_continued',
          fromUserId: req.user._id,
          videoId: video._id,
          chainId: video.rootVideoId,
          message: `${req.user.username} ha continuado tu cadena DOMINO ⛓️`
        });
      }
    }

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
    else {
      video.likes.push(req.user._id);
      // Notificar al autor
      if (video.userId.toString() !== req.user._id.toString()) {
        await Notification.create({
          userId: video.userId,
          type: 'liked',
          fromUserId: req.user._id,
          videoId: video._id,
          chainId: video.rootVideoId,
          message: `A ${req.user.username} le ha gustado tu video ❤️`
        });
      }
    }
    await video.save();
    res.json({ liked: !liked, count: video.likes.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/videos/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ videoId: req.params.id, parentCommentId: null })
      .populate('userId', 'username avatarUrl flag')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/videos/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text, parentCommentId } = req.body;
    if (!text || text.trim().length === 0) return res.status(400).json({ error: 'Comentario vacío' });
    const comment = await Comment.create({
      videoId: req.params.id,
      userId: req.user._id,
      text: text.trim(),
      parentCommentId: parentCommentId || null
    });
    await comment.populate('userId', 'username avatarUrl flag');
    res.status(201).json(comment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/videos/:id/comments/:commentId
router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.commentId, userId: req.user._id });
    if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
    await comment.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
