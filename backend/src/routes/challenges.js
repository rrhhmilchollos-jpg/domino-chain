const router = require('express').Router();
const Challenge = require('../models/Challenge');
const auth = require('../middleware/auth');

// Pool de retos de partida. Cuando no hay ningún reto activo se elige uno
// al azar de aquí (en vez de crear siempre el mismo), evitando repetir el
// que acaba de expirar. Los retos reales de producción también se pueden
// gestionar a mano con POST /api/challenges (solo admin).
const STARTER_CHALLENGES = [
  // Kindness
  { title: '30 Segundos de Bondad', description: 'Graba un acto espontáneo de amabilidad hacia un desconocido. Sin guión, sin preparación — bondad real.', category: 'Kindness' },
  { title: 'Cumplido en Cadena', description: 'Graba el momento en el que le haces un cumplido sincero a alguien. Que se note que es real.', category: 'Kindness' },
  { title: 'Café Pendiente', description: 'Paga un café, un bocadillo o algo pequeño a la siguiente persona en la fila sin que se lo espere.', category: 'Kindness' },
  { title: 'Llamada Sorpresa', description: 'Llama (con vídeo) a alguien a quien hace tiempo que no hablas solo para decirle que te importa.', category: 'Kindness' },
  { title: 'Nota Anónima', description: 'Deja una nota de ánimo anónima en un sitio público para que la encuentre un desconocido. Graba el momento de dejarla.', category: 'Kindness' },
  { title: 'Ayuda Invisible', description: 'Haz una tarea por alguien sin que se entere de que fuiste tú, y cuéntanoslo en vídeo después.', category: 'Kindness' },
  { title: 'Gracias de Verdad', description: 'Dale las gracias en persona y con detalle a alguien que normalmente pasa desapercibido (un repartidor, un conserje, un camarero).', category: 'Kindness' },
  { title: 'Reto del Abrazo', description: 'Dale un abrazo sincero a alguien que lo necesite hoy y nomina a 3 personas para que sigan repartiendo abrazos.', category: 'Kindness' },
  // Creativity
  { title: 'Reto Creativo Relámpago', description: 'Tienes 15 segundos para crear algo con 3 objetos que tengas a mano ahora mismo. Sorpréndenos.', category: 'Creativity' },
  { title: 'Talento Oculto en 15s', description: 'Enseña una habilidad random que tengas y que nadie sepa que tienes. Cuanto más random, mejor.', category: 'Creativity' },
  { title: 'Transforma un Objeto', description: 'Coge un objeto cotidiano y dale un uso completamente distinto al que tiene. Demuéstralo en 15 segundos.', category: 'Creativity' },
  { title: 'Stop Motion Exprés', description: 'Crea una mini animación stop-motion de 15 segundos con lo que tengas en tu habitación.', category: 'Creativity' },
  { title: 'Baila tu Día', description: 'Resume cómo te ha ido el día de hoy con un baile improvisado de 15 segundos.', category: 'Creativity' },
  { title: 'Reto del Sonido', description: 'Crea una mini melodía o ritmo usando solo objetos que no sean instrumentos musicales.', category: 'Creativity' },
  { title: 'Dibujo a Ciegas', description: 'Dibuja algo sin mirar el papel en 15 segundos y enséñanos el resultado tal cual sale.', category: 'Creativity' },
  { title: 'Disfraz Relámpago', description: 'Con lo que tengas a mano ahora mismo, créate un disfraz en 15 segundos. Cuanto más absurdo, mejor.', category: 'Creativity' },
  // Eco
  { title: 'Eco-Reto: Recoge y Pasa', description: 'Recoge 3 piezas de basura en tu calle o parque y nomina a 3 personas para que hagan lo mismo.', category: 'Eco' },
  { title: 'Reto de la Planta', description: 'Planta algo (una semilla, un esqueje) y nomina a 3 personas para que sigan la cadena verde.', category: 'Eco' },
  { title: 'Segunda Vida', description: 'Dale una segunda vida creativa a algo que ibas a tirar a la basura. Enséñanos el antes y el después.', category: 'Eco' },
  { title: 'Apaga y Nomina', description: 'Apaga un aparato o luz que llevaba rato encendida sin necesidad, y nomina a 3 personas a hacer una ronda de ahorro energético en su casa.', category: 'Eco' },
  { title: 'Botella Reutilizable', description: 'Cambia un envase de un solo uso por uno reutilizable hoy mismo y cuéntanos por qué.', category: 'Eco' },
  { title: 'Camino Verde', description: 'Haz a pie, en bici o en transporte público un trayecto que normalmente harías en coche.', category: 'Eco' },
  { title: 'Minuto de Limpieza', description: 'Dedica un minuto exacto a limpiar una zona pública (playa, parque, portal) y muestra el resultado.', category: 'Eco' },
  { title: 'Reto del Tupper', description: 'Lleva tu comida en un tupper en vez de en envases de usar y tirar, y enséñanoslo.', category: 'Eco' },
];

function pickRandomChallenge(excludeTitle) {
  const pool = excludeTitle ? STARTER_CHALLENGES.filter(c => c.title !== excludeTitle) : STARTER_CHALLENGES;
  const t = pool[Math.floor(Math.random() * pool.length)];
  return { ...t, expiresAt: new Date(Date.now() + 24 * 3600000), globalCounter: Math.floor(10000 + Math.random() * 8000) };
}

const isAdmin = (req) => !!process.env.ADMIN_EMAIL && req.user?.email === process.env.ADMIN_EMAIL;

// GET /api/challenges/active — reto del día. Si el anterior ya expiró, se
// activa uno nuevo automáticamente del pool (nunca el mismo que el anterior).
router.get('/active', async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ status: 'active', expiresAt: { $gt: new Date() } }).sort({ activatedAt: -1 });
    if (!challenge) {
      const last = await Challenge.findOne().sort({ activatedAt: -1 });
      const newChallenge = await Challenge.create(pickRandomChallenge(last?.title));
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
