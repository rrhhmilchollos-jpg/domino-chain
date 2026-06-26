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
    const videos = await Video.find({ isPublished: true, $or: [{ isPrivate: false }, { isPublic: true }] })
      .populate('userId', 'username avatarUrl country city flag impactPoints currentStreak isVerified')
      .populate('challengeId', 'title category hashtag')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit));
    res.json(videos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/videos/feed/following
router.get('/feed/following', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const me = await User.findById(req.user._id).select('following');
    const videos = await Video.find({ userId: { $in: me.following }, isPublished: true, $or: [{ isPrivate: false }, { isPublic: true }] })
      .populate('userId', 'username avatarUrl country city flag impactPoints currentStreak isVerified')
      .populate('challengeId', 'title category hashtag')
      .sort({ createdAt: -1 }).limit(Number(limit));
    res.json(videos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/videos/map — para el mapa mundial
router.get('/map', async (req, res) => {
  try {
    const videos = await Video.find({ isPublished: true, 'geoCoordinates.lat': { $ne: 0 } })
      .populate('userId', 'username avatarUrl flag country city')
      .populate('challengeId', 'title category')
      .select('geoCoordinates thumbnailUrl userId challengeId likes views createdAt')
      .sort({ createdAt: -1 }).limit(500);
    res.json(videos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/videos/chain/:rootId
router.get('/chain/:rootId', async (req, res) => {
  try {
    const chain = await Video.find({ rootVideoId: req.params.rootId, isPublished: true })
      .populate('userId', 'username avatarUrl country city flag')
      .sort({ chainDepth: 1 });
    res.json(chain);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/videos/search
router.get('/search', async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;
    if (!q.trim()) return res.json([]);
    const videos = await Video.find({
      isPublished: true, isPrivate: false,
      $or: [{ caption: { $regex: q, $options: 'i' } }, { hashtags: { $in: [q.toLowerCase()] } }]
    }).populate('userId', 'username avatarUrl flag').limit(Number(limit));
    res.json(videos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/videos/:id
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('userId', 'username avatarUrl country city flag impactPoints currentStreak isVerified followers')
      .populate('challengeId', 'title category hashtag description');
    if (!video) return res.status(404).json({ error: 'Video no encontrado' });
    await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json(video);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/videos
router.post('/', auth, async (req, res) => {
  try {
    const { challengeId, videoUrl, thumbnailUrl, cloudinaryId, caption, hashtags, musicTitle, musicArtist, duration, parentVideoId, geoCoordinates, nominatedUserIds, isDuet, duetVideoId } = req.body;
    if (!challengeId) return res.status(400).json({ error: 'challengeId es obligatorio' });
    const geo = geoCoordinates || { lat: 0, lng: 0 };
    let chainDepth = 0, rootVideoId = null;
    if (parentVideoId) {
      const parent = await Video.findById(parentVideoId);
      if (parent) { chainDepth = parent.chainDepth + 1; rootVideoId = parent.rootVideoId || parent._id; }
    }
    const video = await Video.create({
      challengeId, userId: req.user._id,
      videoUrl: videoUrl || '', thumbnailUrl: thumbnailUrl || '', cloudinaryId: cloudinaryId || '',
      caption: caption || '', hashtags: hashtags || [], musicTitle: musicTitle || '', musicArtist: musicArtist || '',
      duration: duration || 15, parentVideoId: parentVideoId || null, rootVideoId,
      geoCoordinates: geo, nominatedUsers: nominatedUserIds || [],
      chainDepth, isPublished: true, isDuet: isDuet || false, duetVideoId: duetVideoId || null
    });
    if (!rootVideoId) await Video.findByIdAndUpdate(video._id, { rootVideoId: video._id });
    await Challenge.findByIdAndUpdate(challengeId, { $inc: { globalCounter: 1 } });
    const points = 100 + chainDepth * 50;
    await User.findByIdAndUpdate(req.user._id, { $inc: { impactPoints: points, totalChains: 1 } });
    if (nominatedUserIds && nominatedUserIds.length > 0) {
      const msgs = nominatedUserIds.map(uid => ({
        userId: uid, type: 'nomination', fromUserId: req.user._id,
        videoId: video._id, chainId: video.rootVideoId || video._id,
        message: `${req.user.username} te ha nominado para continuar la cadena 🔗`
      }));
      await Notification.insertMany(msgs);
      await User.findByIdAndUpdate(req.user._id, { $inc: { totalNominations: nominatedUserIds.length } });
    }
    if (parentVideoId) {
      const parent = await Video.findById(parentVideoId).populate('userId', '_id');
      if (parent && String(parent.userId._id) !== String(req.user._id)) {
        await Notification.create({ userId: parent.userId._id, type: 'chain_continued', fromUserId: req.user._id, videoId: video._id, chainId: video.rootVideoId || video._id, message: `${req.user.username} ha continuado tu cadena 🎯` });
      }
    }
    res.status(201).json(video);
  } catch (e) { res.status(500).json({ error: e.message }); }
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
      if (String(video.userId) !== String(req.user._id)) {
        await Notification.create({ userId: video.userId, type: 'liked', fromUserId: req.user._id, videoId: video._id, message: `${req.user.username} ha dado like a tu vídeo ❤️` });
      }
    }
    await video.save();
    await User.findByIdAndUpdate(video.userId, { $inc: { totalLikes: liked ? -1 : 1 } });
    res.json({ liked: !liked, count: video.likes.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/videos/:id/save
router.post('/:id/save', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const saved = me.savedVideos.includes(req.params.id);
    if (saved) { me.savedVideos.pull(req.params.id); await Video.findByIdAndUpdate(req.params.id, { $inc: { saves: -1 } }); }
    else { me.savedVideos.push(req.params.id); await Video.findByIdAndUpdate(req.params.id, { $inc: { saves: 1 } }); }
    await me.save();
    res.json({ saved: !saved });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/videos/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ videoId: req.params.id, parentId: null })
      .populate('userId', 'username avatarUrl flag isVerified')
      .sort({ createdAt: -1 }).limit(50);
    res.json(comments);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/videos/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text, parentId } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'El comentario no puede estar vacío' });
    const comment = await Comment.create({ videoId: req.params.id, userId: req.user._id, text: text.trim(), parentId: parentId || null });
    await Video.findByIdAndUpdate(req.params.id, { $inc: { commentCount: 1 } });
    if (parentId) await Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
    const video = await Video.findById(req.params.id).select('userId');
    if (video && String(video.userId) !== String(req.user._id)) {
      await Notification.create({ userId: video.userId, type: 'comment', fromUserId: req.user._id, videoId: req.params.id, message: `${req.user.username} ha comentado tu vídeo: "${text.slice(0, 50)}"` });
    }
    const populated = await Comment.findById(comment._id).populate('userId', 'username avatarUrl flag isVerified');
    res.status(201).json(populated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/videos/:id/update-bot — actualizar videoUrl/thumbnail de vídeos de bots (sin auth, solo para bots)
router.patch('/:id/update-bot', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('userId', 'isBot');
    if (!video) return res.status(404).json({ error: 'Video no encontrado' });
    // Solo permitir en vídeos de bots
    const { videoUrl, thumbnailUrl, caption, musicTitle, musicArtist } = req.body;
    const update = {};
    if (videoUrl !== undefined) update.videoUrl = videoUrl;
    if (thumbnailUrl !== undefined) update.thumbnailUrl = thumbnailUrl;
    if (caption !== undefined) update.caption = caption;
    if (musicTitle !== undefined) update.musicTitle = musicTitle;
    if (musicArtist !== undefined) update.musicArtist = musicArtist;
    const updated = await Video.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ ok: true, video: updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/videos/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video no encontrado' });
    if (String(video.userId) !== String(req.user._id)) return res.status(403).json({ error: 'No autorizado' });
    await Video.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
