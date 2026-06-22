const router = require('express').Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const Video = require('../models/Video');
const Challenge = require('../models/Challenge');
const Notification = require('../models/Notification');
const Comment = require('../models/Comment');
const User = require('../models/User');
const SavedVideo = require('../models/SavedVideo');
const VideoView = require('../models/VideoView');
const { SOUND_LIBRARY } = require('./sounds');

async function withIsSaved(videos, requester) {
  if (!requester || videos.length === 0) return videos.map(v => ({ ...v.toObject(), isSaved: false }));
  const ids = videos.map(v => v._id);
  const mySaves = await SavedVideo.find({ userId: requester._id, videoId: { $in: ids } }).select('videoId');
  const savedSet = new Set(mySaves.map(s => s.videoId.toString()));
  return videos.map(v => ({ ...v.toObject(), isSaved: savedSet.has(v._id.toString()) }));
}

// GET /api/videos/feed
router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    // FIX: si hay sesión, excluir los propios vídeos del usuario del feed público.
    // El usuario ve sus propios vídeos desde su perfil/dashboard, no aquí.
    const feedFilter = {
      isPublished: true,
      isPublic: { $ne: false },
      videoUrl: { $ne: '' }
    };
    if (req.user) {
      feedFilter.userId = { $ne: req.user._id };
    }

    const pool = await Video.find(feedFilter)
      .populate('userId', 'username avatarUrl country city flag impactPoints currentStreak')
      .sort({ createdAt: -1 })
      .limit(200);

    const now = Date.now();
    const scored = pool.map(v => {
      const hours = Math.max(0.5, (now - new Date(v.createdAt).getTime()) / 3.6e6);
      const score = ((v.likes?.length || 0) * 3 + 1) / Math.pow(hours + 2, 1.3);
      return { v, score };
    }).sort((a, b) => b.score - a.score).map(x => x.v);

    // Diversidad: nunca dos del mismo autor seguidos
    const diversified = [];
    const pending = [...scored];
    while (pending.length) {
      let idx = pending.findIndex(v => diversified.length === 0 || String(v.userId?._id) !== String(diversified[diversified.length - 1].userId?._id));
      if (idx === -1) idx = 0;
      diversified.push(pending.splice(idx, 1)[0]);
    }

    const start = (pageNum - 1) * limitNum;
    const pageItems = diversified.slice(start, start + limitNum);
    res.json(await withIsSaved(pageItems, req.user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/videos/feed/following
router.get('/feed/following', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const Follow = require('../models/Follow');
    const follows = await Follow.find({ followerId: req.user._id }).select('followingId');
    const followingIds = follows.map(f => f.followingId);
    if (!followingIds.length) return res.json([]);

    const videos = await Video.find({
      userId: { $in: followingIds },
      isPublished: true,
      isPublic: { $ne: false },
      videoUrl: { $ne: '' }
    })
      .populate('userId', 'username avatarUrl country city flag impactPoints currentStreak')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json(await withIsSaved(videos, req.user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/videos/trending
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(30, Number(req.query.limit) || 12);
    const pool = await Video.find({ isPublished: true, isPublic: { $ne: false }, videoUrl: { $ne: '' } })
      .populate('userId', 'username avatarUrl country city flag')
      .sort({ createdAt: -1 })
      .limit(150);

    const now = Date.now();
    const ranked = pool.map(v => {
      const hours = Math.max(0.5, (now - new Date(v.createdAt).getTime()) / 3.6e6);
      const score = ((v.likes?.length || 0) * 3 + (v.savesCount || 0) * 2 + 1) / Math.pow(hours + 2, 1.3);
      return { v, score };
    }).sort((a, b) => b.score - a.score).map(x => x.v).slice(0, limit);

    res.json(await withIsSaved(ranked, req.user));
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

// GET /api/videos/user/:userId
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

// GET /api/videos/liked/:userId
// FIX: antes buscaba { likes: req.params.userId } (string) pero el array
// guarda ObjectIds — con $elemMatch o conversión funciona bien en ambos casos.
router.get('/liked/:userId', auth, async (req, res) => {
  try {
    // Solo el propio usuario puede ver sus likes
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: 'Solo puedes ver tus propios likes' });
    }
    const videos = await Video.find({ likes: req.user._id, isPublished: true })
      .populate('userId', 'username avatarUrl country city flag')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(await withIsSaved(videos, req.user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/videos/saved/:userId
router.get('/saved/:userId', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: 'Solo puedes ver tus propios videos guardados' });
    }
    const saves = await SavedVideo.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(200);
    const videoIds = saves.map(s => s.videoId);
    const videos = await Video.find({ _id: { $in: videoIds } })
      .populate('userId', 'username avatarUrl country city flag');
    const byId = new Map(videos.map(v => [v._id.toString(), v]));
    const ordered = videoIds.map(id => byId.get(id.toString())).filter(Boolean);
    res.json(ordered);
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

// POST /api/videos
router.post('/', auth, async (req, res) => {
  try {
    const { challengeId, videoUrl, thumbnailUrl, parentVideoId, geoCoordinates, nominatedUserIds, caption, remixOfVideoId, remixType, soundId } = req.body;
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

    const cleanCaption = (caption || '').trim().slice(0, 150);
    const hashtags = Array.from(new Set((cleanCaption.match(/#[\p{L}0-9_]+/gu) || []).map(h => h.slice(1).toLowerCase())));

    let remixOf = undefined;
    if (remixOfVideoId && ['duet', 'stitch'].includes(remixType)) {
      const original = await Video.findById(remixOfVideoId).populate('userId', 'username');
      if (!original) return res.status(404).json({ error: 'El video original del dueto/stitch no existe' });
      if (original.isPublic === false && original.userId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'No puedes hacer un dueto/stitch sobre un video privado' });
      }
      remixOf = { videoId: original._id, type: remixType, authorId: original.userId._id, authorUsername: original.userId.username };
    }

    let sound = undefined;
    if (soundId) {
      const s = SOUND_LIBRARY.find(s => s.id === soundId);
      if (s) sound = { id: s.id, title: s.title };
    }

    const video = await Video.create({
      challengeId,
      userId: req.user._id,
      videoUrl: videoUrl || '',
      thumbnailUrl: thumbnailUrl || '',
      caption: cleanCaption,
      hashtags,
      parentVideoId: parentVideoId || null,
      rootVideoId,
      remixOf,
      sound,
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

// PUT /api/videos/:id/visibility
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

// POST /api/videos/:id/save
router.post('/:id/save', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video no encontrado' });

    const existing = await SavedVideo.findOne({ userId: req.user._id, videoId: video._id });
    if (existing) {
      await existing.deleteOne();
      await Video.findByIdAndUpdate(video._id, { $inc: { savesCount: -1 } });
      return res.json({ saved: false, savesCount: Math.max(0, (video.savesCount || 0) - 1) });
    }
    await SavedVideo.create({ userId: req.user._id, videoId: video._id });
    await Video.findByIdAndUpdate(video._id, { $inc: { savesCount: 1 } });
    res.status(201).json({ saved: true, savesCount: (video.savesCount || 0) + 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/videos/:id/view
router.post('/:id/view', optionalAuth, async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } });
    if (req.user) {
      try { await VideoView.create({ videoId: req.params.id, userId: req.user._id }); }
      catch { }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/videos/:id/share
router.post('/:id/share', async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, { $inc: { sharesCount: 1 } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/videos/:id/like
// FIX: ahora también actualiza el array likedVideos del usuario para que
// aparezca en su pestaña "Me gusta" del perfil/dashboard
router.post('/:id/like', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video no encontrado' });

    const liked = video.likes.map(id => id.toString()).includes(req.user._id.toString());

    if (liked) {
      // Quitar like
      video.likes.pull(req.user._id);
      await video.save();
      // Quitar de likedVideos del usuario
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { likedVideos: video._id }
      });
    } else {
      // Dar like
      video.likes.push(req.user._id);
      await video.save();
      // Añadir a likedVideos del usuario (addToSet evita duplicados)
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { likedVideos: video._id }
      });
      // Notificar al autor si no es el mismo usuario
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
    await Video.findByIdAndUpdate(req.params.id, { $inc: { commentsCount: 1 } });
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
