const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Live = require('../models/Live');
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

// POST /api/bots/join-live/:liveId — forzar que un bot entre en un directo (admin)
router.post('/join-live/:liveId', auth, async (req, res) => {
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

    const BOT_PERSONALITIES = require('../services/aiBotEngine');
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

module.exports = router;
