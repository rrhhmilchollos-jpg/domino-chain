const router = require('express').Router();
const auth = require('../middleware/auth');
const Live = require('../models/Live');
const Gift = require('../models/Gift');
const Video = require('../models/Video');

// LiveKit token generation + grabación (Egress)
let AccessToken, EgressClient, EncodedFileOutput, EncodedFileType, DirectFileOutput;
try {
  const livekit = require('livekit-server-sdk');
  AccessToken = livekit.AccessToken;
  EgressClient = livekit.EgressClient;
  EncodedFileOutput = livekit.EncodedFileOutput;
  EncodedFileType = livekit.EncodedFileType;
  DirectFileOutput = livekit.DirectFileOutput;
} catch (e) {
  console.warn('livekit-server-sdk no instalado — lives desactivados');
}

// Cloudinary para subir grabaciones de directos
let cloudinary = null;
try {
  const { v2 } = require('cloudinary');
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    cloudinary = v2;
    console.log('✅ Cloudinary configurado para grabaciones de directos');
  }
} catch (e) {
  console.warn('cloudinary no disponible:', e.message);
}

function generateRoomName(userId) {
  return `domino-live-${userId}-${Date.now()}`;
}

async function generateLivekitToken(roomName, userId, username, isHost = false) {
  if (!AccessToken) return null;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) return null;

  const at = new AccessToken(apiKey, apiSecret, { identity: userId, name: username });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: isHost,      // solo el host publica video/audio
    canSubscribe: true,      // todos pueden ver
    canPublishData: true     // todos pueden enviar mensajes de chat (host y espectadores)
  });
  return await at.toJwt(); // v2 del SDK: toJwt() devuelve una Promise
}

function getLivekitUrl() {
  return process.env.LIVEKIT_URL || null;
}

// ===== Grabación automática (LiveKit Egress -> fichero temporal -> Cloudinary) =====
// Estrategia: LiveKit graba a un fichero local temporal en /tmp, y al terminar
// el live subimos ese fichero a Cloudinary. No necesita S3 ni R2.
// Solo necesita CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
const fs = require('fs');
const path = require('path');

function recordingConfigured() {
  return !!(EgressClient && cloudinary && process.env.LIVEKIT_API_KEY);
}

function getEgressClient() {
  const url = getLivekitUrl();
  if (!EgressClient || !url) return null;
  const host = url.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
  return new EgressClient(host, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
}

// Mapa en memoria: egressId -> ruta del fichero temporal
const egressFiles = {};

async function startRecording(roomName) {
  if (!recordingConfigured()) return null;
  const client = getEgressClient();
  if (!client) return null;
  try {
    const tmpPath = `/tmp/${roomName}-${Date.now()}.mp4`;
    const output = new EncodedFileOutput({
      fileType: EncodedFileType ? EncodedFileType.MP4 : 1,
      filepath: tmpPath,
    });
    const info = await client.startRoomCompositeEgress(roomName, { file: output });
    egressFiles[info.egressId] = tmpPath;
    console.log(`🎙️ Grabación iniciada: ${info.egressId} → ${tmpPath}`);
    return info.egressId;
  } catch (e) {
    console.error('No se pudo iniciar la grabación del live:', e.message);
    return null;
  }
}

async function stopRecording(egressId) {
  const client = getEgressClient();
  if (!client || !egressId) return null;
  try {
    await client.stopEgress(egressId);
  } catch (e) {
    console.error('Error al detener egress:', e.message);
  }

  // Esperar un momento a que el fichero se cierre
  await new Promise(r => setTimeout(r, 4000));

  const tmpPath = egressFiles[egressId];
  if (!tmpPath || !fs.existsSync(tmpPath)) {
    console.warn('Fichero de grabación no encontrado:', tmpPath);
    return null;
  }

  try {
    console.log(`☁️ Subiendo grabación a Cloudinary: ${tmpPath}`);
    const result = await cloudinary.uploader.upload(tmpPath, {
      resource_type: 'video',
      folder: 'domino-lives',
      public_id: `live-${egressId}`,
      overwrite: true,
    });
    // Limpiar fichero temporal
    try { fs.unlinkSync(tmpPath); } catch {}
    delete egressFiles[egressId];
    console.log(`✅ Grabación subida: ${result.secure_url}`);
    return result.secure_url;
  } catch (e) {
    console.error('Error al subir grabación a Cloudinary:', e.message);
    return null;
  }
}

// GET /api/lives — lives activos
router.get('/', async (req, res) => {
  try {
    const lives = await Live.find({ status: 'active' })
      .populate('userId', 'username avatarUrl flag country city impactPoints')
      .sort({ viewerCount: -1, createdAt: -1 })
      .limit(20);
    res.json(lives);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives — crear live
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, isBattle } = req.body;
    if (!title) return res.status(400).json({ error: 'Título requerido' });

    // Terminar lives anteriores del usuario
    await Live.updateMany(
      { userId: req.user._id, status: 'active' },
      { status: 'ended', endedAt: new Date() }
    );

    const roomName = generateRoomName(req.user._id);
    const token = await generateLivekitToken(roomName, req.user._id.toString(), req.user.username, true);

    const live = await Live.create({
      userId: req.user._id,
      title,
      description: description || '',
      roomName,
      livekitToken: token,
      category: category || 'General',
      isBattle: isBattle || false,
      status: 'active'
    });

    // Grabación automática si está configurada (no bloquea la creación del live si falla)
    const egressId = await startRecording(roomName);
    if (egressId) await Live.findByIdAndUpdate(live._id, { egressId });

    await live.populate('userId', 'username avatarUrl flag');

    res.status(201).json({ live, token, roomName, livekitUrl: getLivekitUrl(), recording: !!egressId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/join — conectar a un live (host o espectador, se detecta aquí)
router.post('/:id/join', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id).populate('userId', 'username avatarUrl flag');
    if (!live || live.status !== 'active') return res.status(404).json({ error: 'Live no encontrado o terminado' });

    // BUG ARREGLADO: antes /join siempre emitía un token de espectador
    // (canPublish:false), incluso si quien lo pedía era el propio dueño
    // del live (p.ej. al recargar la página y perder el token guardado
    // en sessionStorage al crearlo). Ahora se comprueba aquí de forma
    // fiable, así el host siempre puede publicar venga de donde venga.
    const isHost = live.userId._id.toString() === req.user._id.toString();
    const token = await generateLivekitToken(live.roomName, req.user._id.toString(), req.user.username, isHost);

    if (!isHost) {
      // Contador en vivo + espectadores únicos reales (no simulados)
      const updated = await Live.findByIdAndUpdate(live._id, {
        $inc: { viewerCount: 1 },
        $addToSet: { viewerIds: req.user._id }
      }, { new: true });
      if (updated.viewerCount > updated.peakViewerCount) {
        await Live.findByIdAndUpdate(live._id, { peakViewerCount: updated.viewerCount });
      }
    }

    res.json({ live, token, roomName: live.roomName, livekitUrl: getLivekitUrl(), isHost });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/leave
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const live = await Live.findById(req.params.id);
    if (live && live.viewerCount > 0) await Live.findByIdAndUpdate(req.params.id, { $inc: { viewerCount: -1 } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/lives/:id — terminar live. Devuelve el resumen real (espectadores
// únicos, pico simultáneo, regalos) y la URL de la grabación si la hubo.
router.delete('/:id', auth, async (req, res) => {
  try {
    const live = await Live.findOne({ _id: req.params.id, userId: req.user._id });
    if (!live) return res.status(404).json({ error: 'Live no encontrado' });

    let recordingUrl = '';
    if (live.egressId) {
      recordingUrl = (await stopRecording(live.egressId)) || '';
    }

    live.status = 'ended';
    live.endedAt = new Date();
    if (recordingUrl) live.recordingUrl = recordingUrl;
    await live.save();

    res.json({
      ok: true,
      summary: {
        totalUniqueViewers: live.viewerIds.length,
        peakViewerCount: live.peakViewerCount,
        totalGiftsReceived: live.totalGiftsReceived,
        durationSeconds: Math.round((live.endedAt - live.createdAt) / 1000),
      },
      recordingUrl: live.recordingUrl || null,
      liveId: live._id,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/lives/:id/publish-as-video — publica la grabación del directo como
// un video normal en el feed de DOMINO (solo el dueño del live, y solo si hay grabación).
router.post('/:id/publish-as-video', auth, async (req, res) => {
  try {
    const live = await Live.findOne({ _id: req.params.id, userId: req.user._id });
    if (!live) return res.status(404).json({ error: 'Live no encontrado' });
    if (!live.recordingUrl) return res.status(400).json({ error: 'Este live no tiene ninguna grabación disponible' });
    if (live.publishedAsVideoId) return res.status(409).json({ error: 'Este live ya se publicó como video' });

    const video = await Video.create({
      userId: req.user._id,
      videoUrl: live.recordingUrl,
      thumbnailUrl: live.thumbnailUrl || '',
      geoCoordinates: { lat: 0, lng: 0 },
      isPublished: true,
    });

    live.publishedAsVideoId = video._id;
    await live.save();

    res.status(201).json({ ok: true, video });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/lives/catalog — catálogo de regalos
router.get('/catalog/gifts', (req, res) => {
  res.json(Gift.CATALOG || {
    domino:  { name: 'Dominó',   emoji: '🁣', coins: 5,    points: 10   },
    chain:   { name: 'Cadena',   emoji: '⛓️', coins: 20,   points: 50   },
    star:    { name: 'Estrella', emoji: '⭐', coins: 50,   points: 100  },
    rocket:  { name: 'Cohete',   emoji: '🚀', coins: 100,  points: 200  },
    crown:   { name: 'Corona',   emoji: '👑', coins: 500,  points: 1000 },
    diamond: { name: 'Diamante', emoji: '💎', coins: 1000, points: 2500 }
  });
});

// POST /api/lives/:id/gift — DEPRECATED: el envío de regalos vive ahora en
// POST /api/coins/gift (esta versión nunca restaba monedas al remitente).
router.post('/:id/gift', auth, async (req, res) => {
  res.status(410).json({ error: 'Usa POST /api/coins/gift' });
});

module.exports = router;
