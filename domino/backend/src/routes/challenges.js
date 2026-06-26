const router = require('express').Router();
const Challenge = require('../models/Challenge');
const Video = require('../models/Video');

const SEED_CHALLENGES = [
  { title: '30 Segundos de Bondad', description: 'Graba un acto espontáneo de amabilidad hacia un desconocido. Sin guión, sin preparación — bondad real.', category: 'Kindness', hashtag: 'BondadReal', difficulty: 'easy', pointsReward: 100, globalCounter: 14782, isFeatured: true },
  { title: 'Transforma tu Espacio Verde', description: 'Planta algo, recicla, o limpia tu entorno. Muestra el antes y después en 15 segundos.', category: 'Eco', hashtag: 'EcoChallenge', difficulty: 'medium', pointsReward: 150, globalCounter: 8934 },
  { title: 'Crea sin Límites', description: 'Muestra tu talento artístico: dibujo, música, baile, escritura — lo que sea. 15 segundos de pura creatividad.', category: 'Creativity', hashtag: 'CreaLibre', difficulty: 'easy', pointsReward: 100, globalCounter: 22156 },
  { title: 'Reto del Silencio', description: 'Comunica una emoción compleja sin usar palabras. Solo gestos, miradas y expresiones.', category: 'Creativity', hashtag: 'SilencioElocuente', difficulty: 'hard', pointsReward: 200, globalCounter: 5621 },
  { title: 'Comida Zero Waste', description: 'Cocina algo delicioso usando solo ingredientes que ibas a tirar. Creatividad culinaria sostenible.', category: 'Eco', hashtag: 'ZeroWasteCook', difficulty: 'medium', pointsReward: 150, globalCounter: 3847 },
  { title: 'Sorpresa Musical', description: 'Toca o canta algo para un desconocido en la calle. Captura su reacción auténtica.', category: 'Music', hashtag: 'MusicaParaTodos', difficulty: 'hard', pointsReward: 200, globalCounter: 7293 },
  { title: 'Baile de la Cadena', description: 'Aprende 3 pasos de baile y enseña a alguien más. La cadena continúa cuando ellos enseñan a otros.', category: 'Dance', hashtag: 'DominosDance', difficulty: 'medium', pointsReward: 150, globalCounter: 18445 },
  { title: 'Deporte Extremo 15s', description: 'Tu mejor truco, salto, o hazaña deportiva en exactamente 15 segundos. Sin edición, sin cortes.', category: 'Sport', hashtag: 'SportDomino', difficulty: 'hard', pointsReward: 200, globalCounter: 9112 },
];

router.get('/active', async (req, res) => {
  try {
    let challenge = await Challenge.findOne({ status: 'active', expiresAt: { $gt: new Date() }, isFeatured: true }).sort({ activatedAt: -1 });
    if (!challenge) challenge = await Challenge.findOne({ status: 'active', expiresAt: { $gt: new Date() } }).sort({ activatedAt: -1 });
    if (!challenge) {
      const seed = SEED_CHALLENGES[0];
      challenge = await Challenge.create({ ...seed, expiresAt: new Date(Date.now() + 24 * 3600000) });
    }
    res.json(challenge);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { category, status = 'active', limit = 20 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status !== 'all') filter.status = status;
    let challenges = await Challenge.find(filter).sort({ isFeatured: -1, globalCounter: -1, activatedAt: -1 }).limit(Number(limit));
    if (challenges.length === 0) {
      const now = new Date();
      const seeded = await Challenge.insertMany(SEED_CHALLENGES.map((c, i) => ({ ...c, expiresAt: new Date(now.getTime() + (i + 1) * 24 * 3600000) })));
      challenges = seeded;
    }
    res.json(challenges);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Reto no encontrado' });
    const videoCount = await Video.countDocuments({ challengeId: req.params.id, isPublished: true });
    res.json({ ...challenge.toObject(), videoCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/videos', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const videos = await Video.find({ challengeId: req.params.id, isPublished: true })
      .populate('userId', 'username avatarUrl flag isVerified')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json(videos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
