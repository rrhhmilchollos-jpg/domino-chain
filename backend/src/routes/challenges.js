const router = require('express').Router();
const Challenge = require('../models/Challenge');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

// Pool de retos de partida. Los Retos Diarios eligen 2 al azar de aquí cada
// día (sin repetir entre sí). Los retos reales de producción también se
// pueden gestionar a mano con POST /api/challenges (solo admin).
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

const isAdmin = (req) => !!process.env.ADMIN_EMAIL && req.user?.email === process.env.ADMIN_EMAIL;

// 'YYYY-MM-DD' en UTC — clave de día real para los Retos Diarios y el calendario.
function dayKeyOf(date) { return date.toISOString().slice(0, 10); }
function todayKey() { return dayKeyOf(new Date()); }
function endOfDayUTC(dayKey) { return new Date(`${dayKey}T23:59:59.999Z`); }

// Se asegura de que un día concreto tenga exactamente 2 retos, generando
// los que falten (nunca repitiendo título entre sí dentro del mismo día).
// Solo se llama para hoy o días pasados — el futuro nunca se "revela" antes
// de tiempo, así que esta función nunca se invoca con un dayKey futuro.
async function ensureDailyChallenges(dayKey) {
  let existing = await Challenge.find({ dayKey }).sort({ slot: 1 });
  if (existing.length >= 2) return existing;

  const usedTitles = new Set(existing.map(c => c.title));
  let pool = STARTER_CHALLENGES.filter(c => !usedTitles.has(c.title));
  const toCreate = [];
  for (let i = existing.length; i < 2; i++) {
    if (pool.length === 0) pool = STARTER_CHALLENGES; // si el pool se agota igualmente, se permite repetir
    const idx = Math.floor(Math.random() * pool.length);
    const pick = pool[idx];
    pool = pool.filter((_, j) => j !== idx);
    usedTitles.add(pick.title);
    toCreate.push({
      ...pick,
      dayKey,
      slot: i + 1,
      expiresAt: endOfDayUTC(dayKey),
      globalCounter: Math.floor(5000 + Math.random() * 9000),
      status: dayKey === todayKey() ? 'active' : 'expired'
    });
  }
  if (toCreate.length) {
    try {
      const created = await Challenge.insertMany(toCreate, { ordered: false });
      existing = existing.concat(created);
    } catch {
      // condición de carrera (dos peticiones a la vez creando el mismo día) —
      // releemos en vez de fallar, el índice único ya habrá dejado solo 2 buenos
      existing = await Challenge.find({ dayKey }).sort({ slot: 1 });
    }
  }
  return existing.sort((a, b) => a.slot - b.slot);
}

// GET /api/challenges/active — para compatibilidad con pantallas ya
// existentes (cámara, banner del feed) que solo esperan UN reto: si un
// admin activó uno a mano (POST sin dayKey) ese tiene prioridad; si no,
// se usa el primero de los 2 Retos Diarios de hoy.
router.get('/active', async (req, res) => {
  try {
    const manual = await Challenge.findOne({ status: 'active', dayKey: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ activatedAt: -1 });
    if (manual) return res.json(manual);
    const daily = await ensureDailyChallenges(todayKey());
    res.json(daily[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/challenges/daily?date=YYYY-MM-DD — los 2 Retos Diarios de ese
// día. Sin parámetro, los de hoy. Los días futuros devuelven [] (no se
// revelan antes de tiempo); los pasados se generan igual si nunca se
// pidieron (para que el calendario siempre tenga algo que mostrar).
router.get('/daily', async (req, res) => {
  try {
    const dayKey = (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) ? req.query.date : todayKey();
    if (dayKey > todayKey()) return res.json([]);
    const challenges = await ensureDailyChallenges(dayKey);
    res.json(challenges);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/challenges/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD — resumen por
// día para pintar el calendario semana a semana. Si hay sesión, marca qué
// retos ha completado ya el usuario (tiene un video publicado con ese
// challengeId). No genera retos para fechas futuras del rango.
router.get('/calendar', optionalAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'Faltan from/to en formato YYYY-MM-DD' });
    }
    const cappedTo = to > todayKey() ? todayKey() : to;
    let challenges = [];
    if (cappedTo >= from) {
      challenges = await Challenge.find({ dayKey: { $gte: from, $lte: cappedTo } }).sort({ dayKey: 1, slot: 1 });

      // Rellenar los días del rango que todavía no tengan sus 2 retos
      // generados — días pasados que nadie había visitado todavía vía
      // /daily. Así el calendario siempre refleja retos reales, nunca
      // huecos vacíos por no haberse "tocado" antes.
      const haveCount = {};
      for (const c of challenges) haveCount[c.dayKey] = (haveCount[c.dayKey] || 0) + 1;
      const missingDays = [];
      let cursor = new Date(`${from}T00:00:00.000Z`);
      const end = new Date(`${cappedTo}T00:00:00.000Z`);
      while (cursor <= end) {
        const dk = dayKeyOf(cursor);
        if ((haveCount[dk] || 0) < 2) missingDays.push(dk);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      if (missingDays.length) {
        await Promise.all(missingDays.map(dk => ensureDailyChallenges(dk)));
        challenges = await Challenge.find({ dayKey: { $gte: from, $lte: cappedTo } }).sort({ dayKey: 1, slot: 1 });
      }
    }

    let completedIds = new Set();
    if (req.user && challenges.length) {
      const ids = challenges.map(c => c._id);
      const myVideos = await Video.find({ userId: req.user._id, challengeId: { $in: ids } }).select('challengeId');
      completedIds = new Set(myVideos.map(v => v.challengeId.toString()));
    }

    const byDay = {};
    for (const c of challenges) {
      if (!byDay[c.dayKey]) byDay[c.dayKey] = { dayKey: c.dayKey, challenges: [] };
      byDay[c.dayKey].challenges.push({
        _id: c._id, title: c.title, category: c.category,
        completed: completedIds.has(c._id.toString())
      });
    }
    res.json(Object.values(byDay));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/challenges/:id — un reto concreto (la cámara lo usa cuando se
// entra con ?challengeId=, para grabar para uno de los 2 Retos Diarios)
router.get('/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Reto no encontrado' });
    res.json(challenge);
  } catch (e) {
    res.status(404).json({ error: 'Reto no encontrado' });
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

// POST /api/challenges — crear un reto manual (solo el admin: ADMIN_EMAIL).
// Queda fuera del sistema de dayKey/slot — pensado para anuncios especiales
// que el admin quiera forzar como "el" reto activo por encima de los 2 diarios.
router.post('/', auth, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Solo el admin puede crear retos' });
    const { title, description, category, hoursActive = 24, coverImageUrl, activateNow = true } = req.body;
    if (!title || !description || !category) return res.status(400).json({ error: 'Faltan title, description o category' });
    if (!['Creativity', 'Kindness', 'Eco'].includes(category)) return res.status(400).json({ error: "category debe ser 'Creativity', 'Kindness' o 'Eco'" });

    if (activateNow) {
      await Challenge.updateMany({ status: 'active', dayKey: { $exists: false } }, { status: 'expired' });
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
