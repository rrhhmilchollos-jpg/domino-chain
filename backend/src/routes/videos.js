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

// Marca isSaved en cada video de una lista según quién pregunta (una sola
// consulta batch) — así el icono de guardado sale correcto desde el primer
// render en vez de asumir que nada está guardado.
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
    const pageItems = diversified.slice(start, start + limitNum);
    res.json(await withIsSaved(pageItems, req.user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/videos/feed/following — pestaña "Siguiendo": solo videos de
// cuentas reales a las que sigue el usuario logueado (nunca sugeridas).
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

// GET /api/videos/trending — videos más populares recientes, para la
// pantalla de Descubrir cuando todavía no se ha escrito ninguna búsqueda.
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

// GET /api/videos/saved/:userId — videos guardados/favoritos. A diferencia
// de /liked, esto SÍ se protege en el servidor (no solo se oculta en el
// frontend): los guardados son una lista privada y solo su dueño puede verla.
router.get('/saved/:userId', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: 'Solo puedes ver tus propios videos guardados' });
    }
    const saves = await SavedVideo.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(200);
    const videoIds = saves.map(s => s.videoId);
    const videos = await Video.find({ _id: { $in: videoIds } })
      .populate('userId', 'username avatarUrl country city flag');
    // Mantener el orden "guardado más reciente primero", no el orden de Mongo
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

// POST /api/videos — publicar video
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

    // Hashtags reales extraídos del texto que escribió el usuario — nunca inventados.
    const cleanCaption = (caption || '').trim().slice(0, 150);
    const hashtags = Array.from(new Set((cleanCaption.match(/#[\p{L}0-9_]+/gu) || []).map(h => h.slice(1).toLowerCase())));

    // Dueto/Stitch: si viene remixOfVideoId, validamos que el original existe
    // y es público, y guardamos quién es su autor real (cuenta real, nunca inventada).
    let remixOf = undefined;
    if (remixOfVideoId && ['duet', 'stitch'].includes(remixType)) {
      const original = await Video.findById(remixOfVideoId).populate('userId', 'username');
      if (!original) return res.status(404).json({ error: 'El video original del dueto/stitch no existe' });
      if (original.isPublic === false && original.userId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'No puedes hacer un dueto/stitch sobre un video privado' });
      }
      remixOf = { videoId: original._id, type: remixType, authorId: original.userId._id, authorUsername: original.userId.username };
    }

    // Música — validamos contra el catálogo real para no guardar nunca un
    // título inventado; si el id no existe simplemente se publica sin sonido.
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

// POST /api/videos/:id/save — guardar/quitar de guardados (toggle, privado — sin notificación, a diferencia del like)
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

// POST /api/videos/:id/view — registra una reproducción real. Se llama desde
// el feed cuando un video lleva un rato visible en pantalla (no en cada
// scroll de paso). Si hay sesión, además registra el "alcance" único —
// este mismo usuario nunca vuelve a contar como persona nueva alcanzada
// para este video, gracias al índice único de VideoView.
router.post('/:id/view', optionalAuth, async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } });
    if (req.user) {
      try { await VideoView.create({ videoId: req.params.id, userId: req.user._id }); }
      catch { /* índice único: este usuario ya contaba como alcance, no pasa nada */ }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/videos/:id/share — registra una vez compartido real (se llama
// solo cuando el panel nativo de compartir se completa o el enlace se
// copia de verdad, nunca solo por abrir el menú).
router.post('/:id/share', async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, { $inc: { sharesCount: 1 } });
    res.json({ ok: true });
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
