const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Live = require('../models/Live');
const Gift = require('../models/Gift');
const { botJoinLive, generateChatMessage } = require('../services/aiBotEngine');

// GET /api/bots — lista de bots activos (público)
router.get('/', async (req, res) => {
  try {
    const bots = await User.find({ isBot: true })
      .select('username avatarUrl bio impactPoints coins isVerified flag city country createdAt')
      .sort({ impactPoints: -1 });
    res.json(bots);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/bots/status — estado de todos los bots y sus lives (público)
router.get('/status', async (req, res) => {
  try {
    const bots = await User.find({ isBot: true })
      .select('username avatarUrl bio impactPoints coins isVerified flag city country');
    const botsWithLives = await Promise.all(bots.map(async (bot) => {
      const activeLive = await Live.findOne({ userId: bot._id, isActive: true })
        .select('title viewerCount totalGifts createdAt roomId');
      const totalGiftsSent = await Gift.countDocuments({ fromUserId: bot._id, isBot: true });
      return { ...bot.toObject(), activeLive: activeLive || null, isLive: !!activeLive, totalGiftsSent };
    }));
    res.json({
      bots: botsWithLives,
      totalBots: bots.length,
      botsInLive: botsWithLives.filter(b => b.isLive).length,
      timestamp: new Date().toISOString(),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/bots/lives — todos los lives activos de bots (público)
router.get('/lives', async (req, res) => {
  try {
    const botUsers = await User.find({ isBot: true }).select('_id');
    const botIds = botUsers.map(b => b._id);
    const botLives = await Live.find({ userId: { $in: botIds }, isActive: true })
      .populate('userId', 'username avatarUrl flag isBot isVerified impactPoints coins city country')
      .sort({ viewerCount: -1 });
    res.json(botLives);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/bots/join-live/:liveId — forzar que un bot entre en un directo
router.post('/join-live/:liveId', async (req, res) => {
  try {
    const live = await Live.findById(req.params.liveId);
    if (!live || !live.isActive) return res.status(404).json({ error: 'Directo no encontrado' });

    const bots = await User.find({ isBot: true });
    if (bots.length === 0) return res.status(404).json({ error: 'No hay bots disponibles' });

    const bot = bots[Math.floor(Math.random() * bots.length)];
    await botJoinLive(bot, live, global.io);

    res.json({ ok: true, bot: { username: bot.username, avatarUrl: bot.avatarUrl } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/bots/chat/:liveId — bot envía mensaje en directo
router.post('/chat/:liveId', async (req, res) => {
  try {
    const { botUsername, context } = req.body;
    const bot = await User.findOne({ username: botUsername, isBot: true });
    if (!bot) return res.status(404).json({ error: 'Bot no encontrado' });

    const live = await Live.findById(req.params.liveId);
    if (!live || !live.isActive) return res.status(404).json({ error: 'Directo no activo' });

    const msg = await generateChatMessage(
      { chatStyle: 'hype', personality: `Eres ${bot.username}, un bot de DOMINO. Hablas en español. Máximo 15 palabras.` },
      context || live.title
    );

    if (global.io) {
      global.io.to(`live:${req.params.liveId}`).emit('live_message', {
        user: bot.username,
        userId: bot._id,
        avatarUrl: bot.avatarUrl,
        text: msg,
        isBot: true,
        type: 'chat',
        timestamp: new Date().toISOString(),
      });
    }

        res.json({ ok: true, message: msg });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/bots/init — inicializar/crear todos los bots y sus lives directamente
router.post('/init', async (req, res) => {
  try {
    const { initializeBots, botJoinLive } = require('../services/aiBotEngine');
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 1. Inicializar bots en la BD
    await initializeBots();

    // 2. Cerrar lives anteriores de bots
    const botUsers = await User.find({ isBot: true });
    for (const bot of botUsers) {
      await Live.updateMany({ userId: bot._id, isActive: true }, { isActive: false, endedAt: new Date() });
    }

    // 3. Crear lives para cada bot
    const LIVE_TITLES = [
      '🎲 DOMINO KING EN VIVO — ¡Retos en directo!',
      '👑 CADENA QUEEN — ¡Humor y retos!',
      '💪 RETO MASTER — Consejos y motivación',
      '🚀 VIRAL BOT — ¡Lo más trending ahora!',
      '⛓️ CHAIN BREAKER — ¡Rompiendo cadenas!',
    ];

    const createdLives = [];
    for (let i = 0; i < botUsers.length; i++) {
      const bot = botUsers[i];
      const title = LIVE_TITLES[i] || `🤖 ${bot.username} EN DIRECTO`;
      const live = await Live.create({
        userId: bot._id,
        title,
        thumbnailUrl: bot.avatarUrl,
        roomId: `domino-bot-live-${bot._id}-${Date.now()}`,
        viewerCount: Math.floor(Math.random() * 50) + 10,
        isActive: true,
      });
      createdLives.push({ bot: bot.username, liveId: live._id, title });

      // Emitir evento de nuevo live
      if (global.io) {
        global.io.emit('live_started', {
          liveId: live._id,
          userId: bot._id,
          username: bot.username,
          title,
          isBot: true,
        });
      }
    }

    res.json({
      ok: true,
      message: `${botUsers.length} bots inicializados con lives activos`,
      lives: createdLives,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
