const router = require('express').Router();
const Challenge = require('../models/Challenge');
const auth = require('../middleware/auth');

// Pool de retos de partida. Cuando no hay ningún reto activo se elige uno
// al azar de aquí (en vez de crear siempre el mismo). Los retos reales de
// producción se gestionan con POST /api/challenges (solo admin).
const STARTER_CHALLENGES = [
  { title: '30 Segundos de Bondad', description: 'Graba un acto espontáneo de amabilidad hacia un desconocido. Sin guión, sin preparación — bondad real.', category: 'Kindness' },
  { title: 'Reto Creativo Relámpago', description: 'Tienes 15 segundos para crear algo con 3 objetos que tengas a mano ahora mismo. Sorpréndenos.', category: 'Creativity' },
  { title: 'Eco-Reto: Recoge y Pasa', description: 'Recoge 3 piezas de basura en tu calle o parque y nomina a 3 personas para que hagan lo mismo.', category: 'Eco' },
  { title: 'Cumplido en Cadena', description: 'Graba el momento en el que le haces un cumplido sincero a alguien. Que se note que es real.', category: 'Kindness' },
  { title: 'Talento Oculto en 15s', description: 'Enseña una habilidad random que tengas y que nadie sepa que tienes. Cuanto más random, mejor.', category: 'Creativity' },
  { title: 'Reto de la Planta', description: 'Planta algo (una semilla, un esqueje) y nomina a 3 personas para que sigan la cadena verde.', category: 'Eco' },
];

function pickRandomChallenge() {
  const t = STARTER_CHALLENGES[Math.floor(Math.random() * STARTER_CHALLENGES.length)];
  return { ...t, expiresAt: new Date(Date.now() + 24 * 3600000), globalCounter: Math.floor(10000 + Math.random() * 8000) };
}

const isAdmin = (req) => !!process.env.ADMIN_EMAIL && req.user?.email === process.env.ADMIN_EMAIL;

// GET /api/challenges/active — reto del día
router.get('/active', async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ status: 'active', expiresAt: { $gt: new Date() } }).sort({ activatedAt: -1 });
    if (!challenge) {
      const newChallenge = await Challenge.create(pickRandomChallenge());
      return res.json(newChallenge);
    }
    res.json(challenge);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/challenges
router.get('/', async (req, res) => {
  try {
    const challenges = await Challenge.find().sort({ activatedAt: -1 }).limit(20);
    res.json(challenges);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/challenges — crear un reto nuevo (solo el admin: ADMIN_EMAIL)
// Si activateNow=true, expira el resto de retos activos para que este sea
// el único "reto del día" visible en la home/feed/cámara.
router.post('/', auth, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Solo el admin puede crear retos' });
    const { title, description, category, hoursActive = 24, coverImageUrl, activateNow = true } = req.body;
    if (!title || !description || !category) return res.status(400).json({ error: 'Faltan title, description o category' });
    if (!['Creativity', 'Kindness', 'Eco'].includes(category)) return res.status(400).json({ error: "category debe ser 'Creativity', 'Kindness' o 'Eco'" });

    if (activateNow) {
      await Challenge.updateMany({ status: 'active' }, { status: 'expired' });
    }
    const challenge = await Challenge.create({
      title, description, category, coverImageUrl: coverImageUrl || '',
      expiresAt: new Date(Date.now() + hoursActive * 3600000),
      status: activateNow ? 'active' : 'expired'
    });
    res.status(201).json(challenge);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
