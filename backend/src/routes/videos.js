const router = require('express').Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const Video = require('../models/Video');
const Challenge = require('../models/Challenge');
const Notification = require('../models/Notification');
const Comment = require('../models/Comment');
const User = require('../models/User');

// GET /api/videos/feed
router.get('/feed', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    // Solo videos con archivo real y públicos: uno sin videoUrl no tiene nada
    // que reproducir, y uno privado no debe verlo nadie salvo su dueño (que
    // accede a sus propios videos desde el Dashboard, no desde este feed).
    // FIX: usamos $ne:false en vez de true — los videos creados antes de
    // añadir el campo isPublic al schema no lo tienen guardado en Mongo
    // (el default de Mongoose solo aplica a documentos nuevos), así que
    // exigir isPublic:true los excluía aunque siguieran siendo públicos.
    const pool = await Video.find({ isPublished: true, isPublic: { $ne: false }, videoUrl: { $ne: '' } })
      .populate('userId', 'username avatarUrl country city flag impactPoints currentStreak')
      .sort({ createdAt: -1 })
      .limit(200); // ventana de candidatos recientes sobre la que rankear/diversificar

    const now = Date.now();
    const scored = pool.map(v => {
      const hours = Math.max(0.5, (now - new Date(v.createdAt).getTime()) / 3.6e6);
      // Más interacción (likes) sube el video; cuanto más viejo, más decae —
      // parecido a cómo TikTok pesa interacción + recencia, sin pretender
      // ser su modelo de ML real.
      const score = ((v.likes?.length || 0) * 3 + 1) / Math.pow(hours + 2, 1.3);
      return { v, score };
    }).sort((a, b) => b.score - a.score).map(x => x.v);

    // Diversidad: nunca dos publicaciones seguidas del mismo autor (igual
    // que documenta TikTok para su Following/For You feed).
    const diversified = [];
    const pending = [...scored];
    while (pending.length) {
      let idx = pending.findIndex(v => diversified.length === 0 || String(v.userId?._id) !== String(diversified[diversified.length - 1].userId?._id));
      if (idx === -1) idx = 0; // no hay alternativa (p.ej. solo queda un autor): se permite repetir
      diversified.push(pending.splice(idx, 1)[0]);
    }

    const start = (pageNum - 1) * limitNum;
    res.json(diversified.slice(start, start + limitNum));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/videos/chain/:rootId
router.get('/chain/:rootId', async (req, res) => {
  try {
    const chain = await Video.find({ rootVideoId: req.params.rootId, isPublished: true, isPublic: { $ne: false } })
      .populate('userId', 'username avatarUrl country city flag')
      .sort({ chainDepth: 1 });
    res.json(chain);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/videos/user/:userId — videos publicados por un usuario (para su dashboard/perfil)
// Usa optionalAuth: si quien pregunta es el propio dueño, ve también sus videos
// privados; cualquier otro visitante (o nadie logueado) solo ve los públicos.
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const isOwner = req.user && String(req.user._id) === String(req.params.userId);
    const filter = { userId: req.params.userId, isPublished: true };
    if (!isOwner) filter.isPublic = { $ne: false };

    const videos = await Video.find(filter)
      .populate('userId', 'username avatarUrl country city flag')
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/videos/liked/:userId — videos a los que el usuario ha dado 'me gusta' (pestaña Me Gusta, solo el propio dueño la ve desde el frontend)
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

    const video = await Video.create({
      challengeId,
      userId: req.user._id,
      videoUrl: videoUrl || '',
      thumbnailUrl: thumbnailUrl || '',
      parentVideoId: parentVideoId || null,
      rootVideoId,
      geoCoordinates,
      nominatedUsers: nominatedUserIds,
      chainDepth,
      isPublished: true
    });

    if (!rootVideoId) {
      await Video.findByIdAndUpdate(video._id, { rootVideoId: video._id });
      video.rootVideoId = video._id;
    }

    await Challenge.findByIdAndUpdate(challengeId, { $inc: { globalCounter: 1 } });

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { impactPoints: 100 + chainDepth * 50 },
      lastActiveDate: new Date()
    });

    const msgs = nominatedUserIds.map(uid => ({
      userId: uid,
      type: 'nomination',
      fromUserId: req.user._id,
      videoId: video._id,
      chainId: video.rootVideoId || video._id,
      message: `${req.user.username} te ha nominado para continuar la cadena DOMINO 🎲`
    }));
    await Notification.insertMany(msgs);

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

// PUT /api/videos/:id/visibility — el dueño cambia un video a público o privado
router.put('/:id/visibility', auth, async (req, res) => {
  try {
    const { isPublic } = req.body;
    if (typeof isPublic !== 'boolean') return res.status(400).json({ error: 'isPublic debe ser true o false' });
    const video = await Video.findOne({ _id: req.params.id, userId: req.user._id });
    if (!video) return res.status(404).json({ error: 'Video no encontrado' });
    video.isPublic = isPublic;
    await video.save();
    res.json({ ok: true, isPublic: video.isPublic });
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
