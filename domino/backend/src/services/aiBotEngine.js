/**
 * DOMINO AI Bot Engine
 * Bots de IA autónomos que actúan como usuarios reales:
 * - Publican vídeos con retos
 * - Entran en directos de otros usuarios
 * - Chatean, reaccionan a regalos, hacen comentarios
 * - Envían regalos en directos
 * - Nominan a otros usuarios
 */

const OpenAI = require('openai');
const User = require('../models/User');
const Video = require('../models/Video');
const Live = require('../models/Live');
const Gift = require('../models/Gift');
const Notification = require('../models/Notification');
const Challenge = require('../models/Challenge');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Catálogo de regalos ───────────────────────────────────────────────────
const GIFT_CATALOG = {
  domino:  { coins: 5,    points: 10   },
  chain:   { coins: 20,   points: 50   },
  star:    { coins: 50,   points: 100  },
  fire:    { coins: 10,   points: 25   },
  heart:   { coins: 15,   points: 30   },
};

// ─── Personalidades de los bots ───────────────────────────────────────────
const BOT_PERSONALITIES = [
  {
    name: 'DominoKing',
    username: 'dominoking_bot',
    personality: 'Eres DominoKing, un usuario apasionado de los retos de dominó. Eres hype, usas emojis, animas a todos, haces comentarios energéticos y divertidos. Hablas en español de España. Máximo 20 palabras por mensaje.',
    chatStyle: 'hype',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DominoKing&backgroundColor=b6e3f4',
    interests: ['retos', 'dominó', 'cadenas', 'viral'],
    postFrequency: 4,
    joinLiveProb: 0.6,
  },
  {
    name: 'CadenaQueen',
    username: 'cadena_queen',
    personality: 'Eres CadenaQueen, una chica divertida y carismática que ama los retos virales. Eres graciosa, usas humor, haces bromas y animas a la gente. Hablas en español. Máximo 20 palabras por mensaje.',
    chatStyle: 'funny',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CadenaQueen&backgroundColor=ffd5dc',
    interests: ['viral', 'humor', 'retos', 'baile'],
    postFrequency: 3,
    joinLiveProb: 0.7,
  },
  {
    name: 'RetoMaster',
    username: 'retomaster_ai',
    personality: 'Eres RetoMaster, un experto en retos de DOMINO. Eres serio pero motivador, das consejos, animas a completar retos y nominás a otros. Hablas en español. Máximo 20 palabras por mensaje.',
    chatStyle: 'serious',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RetoMaster&backgroundColor=c0aede',
    interests: ['retos', 'motivación', 'cadenas', 'nominaciones'],
    postFrequency: 5,
    joinLiveProb: 0.4,
  },
  {
    name: 'ViralBot',
    username: 'viralbot_domino',
    personality: 'Eres ViralBot, un bot que siempre está al día de lo más viral. Comentas todo, reaccionas exageradamente, usas mucho slang y emojis. Hablas en español. Máximo 15 palabras por mensaje.',
    chatStyle: 'hype',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ViralBot&backgroundColor=d1f4e0',
    interests: ['viral', 'trending', 'retos', 'memes'],
    postFrequency: 2,
    joinLiveProb: 0.8,
  },
  {
    name: 'ChainBreaker',
    username: 'chainbreaker_ai',
    personality: 'Eres ChainBreaker, un bot rebelde y gracioso que siempre rompe las cadenas de retos de formas inesperadas. Eres creativo y sorprendente. Hablas en español. Máximo 20 palabras por mensaje.',
    chatStyle: 'funny',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChainBreaker&backgroundColor=ffdfbf',
    interests: ['creatividad', 'sorpresa', 'retos', 'humor'],
    postFrequency: 6,
    joinLiveProb: 0.5,
  },
];

// ─── Frases de chat para directos (fallback sin API) ─────────────────────
const CHAT_PHRASES = {
  hype: ['🔥🔥🔥', '¡Esto es una pasada!', '¡Vamos vamos vamos!', '¡El mejor directo de hoy!', '❤️❤️❤️', '¡Qué crack!', '¡No me lo puedo creer!', '🚀🚀', '¡Sigue así!', '¡Increíble!'],
  funny: ['jajajaja 😂', '¡Me muero de risa!', '¡Esto no puede ser real!', '😂😂😂', '¡Eres lo más!', '¡Qué locura!', '¡Me estoy partiendo!', '🤣🤣', '¡Genio!', '¡Jajaja qué bueno!'],
  serious: ['Muy buen reto 👏', 'Técnica perfecta', 'Así se hace', 'Nominación merecida', 'Gran cadena', 'Impresionante ejecución', 'Eres un ejemplo', 'Sigue nominando', '💪', 'Excelente'],
  friendly: ['¡Hola a todos! 👋', '¡Qué bonito directo!', '¡Me encanta!', '❤️', '¡Genial!', '¡Sigue así!', '¡Eres increíble!', '¡Gracias por el directo!', '¡Qué talento!', '¡Bravo!'],
};

const GIFT_REACTIONS = {
  domino: ['¡Gracias por el dominó! 🎲', '¡Eres un crack! 🎲🎲', '¡Dominó para el mejor! 🎲'],
  star: ['¡Gracias por la estrella! ⭐', '¡Eres una estrella! ⭐⭐', '¡Brillante! ⭐'],
  fire: ['¡FUEGO! 🔥🔥🔥', '¡Esto está ardiendo! 🔥', '¡Gracias por el fuego! 🔥'],
  heart: ['¡Gracias por el corazón! ❤️', '¡Te quiero! ❤️❤️', '¡Amor puro! ❤️'],
  rocket: ['¡COHETE! 🚀🚀🚀', '¡Despegando! 🚀', '¡Al infinito! 🚀'],
  crown: ['¡CORONA! 👑👑👑', '¡El rey/reina! 👑', '¡Gracias por la corona! 👑'],
  diamond: ['¡DIAMANTE! 💎💎💎', '¡Eres un diamante! 💎', '¡Gracias! 💎💎'],
};

// ─── Inicializar bots en la base de datos ─────────────────────────────────
async function initializeBots() {
  try {
    for (const botDef of BOT_PERSONALITIES) {
      const existing = await User.findOne({ username: botDef.username });
      if (!existing) {
        const bot = await User.create({
          username: botDef.username,
          email: `${botDef.username}@domino-ai.internal`,
          password: require('crypto').randomBytes(32).toString('hex'),
          avatarUrl: botDef.avatar,
          bio: `Bot de IA de DOMINO 🤖 | ${botDef.name}`,
          isBot: true,
          isVerified: true,
          coins: 10000,
          impactPoints: Math.floor(Math.random() * 5000) + 1000,
          country: 'España',
          flag: '🇪🇸',
          city: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao'][Math.floor(Math.random() * 5)],
        });
        console.log(`🤖 Bot creado: ${botDef.username} (${bot._id})`);
      }
    }
    console.log('✅ Bots de IA inicializados');
  } catch (e) {
    console.error('❌ Error inicializando bots:', e.message);
  }
}

// ─── Generar mensaje de chat con IA ──────────────────────────────────────
async function generateChatMessage(personality, context) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Fallback sin API
      const phrases = CHAT_PHRASES[personality.chatStyle] || CHAT_PHRASES.friendly;
      return phrases[Math.floor(Math.random() * phrases.length)];
    }
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: personality.personality },
        { role: 'user', content: `Contexto del directo: "${context}". Escribe UN mensaje corto de chat (máximo 15 palabras, en español, con emojis).` }
      ],
      max_tokens: 60,
      temperature: 0.9,
    });
    return completion.choices[0]?.message?.content?.trim() || '🔥';
  } catch {
    const phrases = CHAT_PHRASES[personality.chatStyle] || CHAT_PHRASES.friendly;
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
}

// ─── Bot entra en un directo ──────────────────────────────────────────────
async function botJoinLive(botUser, live, io) {
  try {
    const personality = BOT_PERSONALITIES.find(p => p.username === botUser.username) || BOT_PERSONALITIES[0];

    // Incrementar viewers
    await Live.findByIdAndUpdate(live._id, { $inc: { viewerCount: 1 } });

    // Enviar mensaje de bienvenida
    const welcomeMsg = await generateChatMessage(personality, live.title);
    if (io) {
      io.to(`live:${live._id}`).emit('live_message', {
        user: botUser.username,
        userId: botUser._id,
        avatarUrl: botUser.avatarUrl,
        text: welcomeMsg,
        isBot: true,
        type: 'chat',
        timestamp: new Date().toISOString(),
      });
    }

    // Programar mensajes periódicos (3-8 mensajes durante el directo)
    const numMessages = Math.floor(Math.random() * 6) + 3;
    for (let i = 0; i < numMessages; i++) {
      const delay = (i + 1) * (Math.random() * 45000 + 15000); // 15-60s entre mensajes
      setTimeout(async () => {
        try {
          const liveStillActive = await Live.findById(live._id);
          if (!liveStillActive?.isActive) return;
          const msg = await generateChatMessage(personality, live.title);
          if (io) {
            io.to(`live:${live._id}`).emit('live_message', {
              user: botUser.username,
              userId: botUser._id,
              avatarUrl: botUser.avatarUrl,
              text: msg,
              isBot: true,
              type: 'chat',
              timestamp: new Date().toISOString(),
            });
          }
          await User.findByIdAndUpdate(botUser._id, { $inc: { 'botStats.totalMessages': 1 } }).catch(() => {});
        } catch {}
      }, delay);
    }

    // Probabilidad de enviar un regalo (30%)
    if (Math.random() < 0.3) {
      const giftDelay = Math.random() * 60000 + 30000; // 30-90s
      setTimeout(async () => {
        try {
          const liveStillActive = await Live.findById(live._id);
          if (!liveStillActive?.isActive) return;
          const giftTypes = Object.keys(GIFT_CATALOG);
          const giftType = giftTypes[Math.floor(Math.random() * Math.min(5, giftTypes.length))]; // regalos pequeños
          const giftDef = GIFT_CATALOG[giftType];
          const bot = await User.findById(botUser._id);
          if (!bot || bot.coins < giftDef.coins) return;

          await User.findByIdAndUpdate(botUser._id, { $inc: { coins: -giftDef.coins } });
          await User.findByIdAndUpdate(live.userId, { $inc: { impactPoints: giftDef.points, coins: Math.floor(giftDef.coins * 0.7) } });
          await Live.findByIdAndUpdate(live._id, { $inc: { totalGifts: giftDef.coins } });

          const gift = await Gift.create({
            liveId: live._id, fromUserId: botUser._id, toUserId: live.userId,
            giftType, coins: giftDef.coins, points: giftDef.points, quantity: 1, isBot: true,
          });
          const populated = await Gift.findById(gift._id).populate('fromUserId', 'username avatarUrl flag isBot');

          if (io) {
            io.to(`live:${live._id}`).emit('live_gift', { gift: populated });
            // Reacción del host (mensaje automático)
            const reactions = GIFT_REACTIONS[giftType] || ['¡Gracias! ❤️'];
            setTimeout(() => {
              io.to(`live:${live._id}`).emit('live_message', {
                user: botUser.username,
                userId: botUser._id,
                avatarUrl: botUser.avatarUrl,
                text: reactions[Math.floor(Math.random() * reactions.length)],
                isBot: true,
                type: 'gift_reaction',
                timestamp: new Date().toISOString(),
              });
            }, 2000);
          }
        } catch {}
      }, giftDelay);
    }

    console.log(`🤖 Bot ${botUser.username} entró en directo: ${live.title}`);
  } catch (e) {
    console.error(`❌ Error bot join live:`, e.message);
  }
}

// ─── Ciclo principal de bots ──────────────────────────────────────────────
async function runBotCycle(io) {
  try {
    // Obtener directos activos
    const activeLives = await Live.find({ isActive: true })
      .populate('userId', 'username isBot')
      .sort({ viewerCount: -1 }).limit(10);

    if (activeLives.length === 0) return;

    // Para cada bot, decidir si entra en un directo
    for (const botDef of BOT_PERSONALITIES) {
      const botUser = await User.findOne({ username: botDef.username });
      if (!botUser) continue;

      // Probabilidad de entrar en un directo
      if (Math.random() > botDef.joinLiveProb) continue;

      // Elegir un directo aleatorio (no del propio bot)
      const eligibleLives = activeLives.filter(l => String(l.userId._id) !== String(botUser._id));
      if (eligibleLives.length === 0) continue;

      const live = eligibleLives[Math.floor(Math.random() * eligibleLives.length)];
      await botJoinLive(botUser, live, io);

      // Solo un bot por ciclo para no saturar
      break;
    }
  } catch (e) {
    console.error('❌ Error en ciclo de bots:', e.message);
  }
}

// ─── Bot publica un vídeo de reto ─────────────────────────────────────────
async function botPostVideo(io) {
  try {
    const challenges = await Challenge.find({ isActive: true }).limit(20);
    if (challenges.length === 0) return;

    // Elegir un bot aleatorio
    const botDef = BOT_PERSONALITIES[Math.floor(Math.random() * BOT_PERSONALITIES.length)];
    const botUser = await User.findOne({ username: botDef.username });
    if (!botUser) return;

    const challenge = challenges[Math.floor(Math.random() * challenges.length)];

    // Vídeos de demostración (URLs de Cloudinary de ejemplo)
    const demoVideos = [
      'https://res.cloudinary.com/dawgpvzpr/video/upload/v1/domino_demo/reto1.mp4',
      'https://res.cloudinary.com/dawgpvzpr/video/upload/v1/domino_demo/reto2.mp4',
    ];

    const video = await Video.create({
      userId: botUser._id,
      challengeId: challenge._id,
      videoUrl: demoVideos[Math.floor(Math.random() * demoVideos.length)],
      thumbnailUrl: botUser.avatarUrl,
      caption: `¡Acepto el reto ${challenge.hashtag}! 🎲 ¿Quién se atreve? #DOMINO #${challenge.hashtag}`,
      isPublished: true,
      isBot: true,
      geoCoordinates: { lat: 40.4168 + (Math.random() - 0.5) * 10, lng: -3.7038 + (Math.random() - 0.5) * 10 },
    });

    await User.findByIdAndUpdate(botUser._id, { $inc: { 'botStats.totalPosts': 1 } }).catch(() => {});

    if (io) {
      io.emit('new_video', { video, isBot: true });
    }

    console.log(`🤖 Bot ${botUser.username} publicó vídeo del reto: ${challenge.title}`);
  } catch (e) {
    console.error('❌ Error bot post video:', e.message);
  }
}

// ─── Iniciar el motor de bots ─────────────────────────────────────────────
async function startBotEngine(io) {
  console.log('🤖 Iniciando motor de bots de IA...');

  // Inicializar bots en la BD
  await initializeBots();

  // Ciclo de bots en directos: cada 2 minutos
  setInterval(() => runBotCycle(io), 2 * 60 * 1000);

  // Publicar vídeos: cada 30 minutos
  setInterval(() => botPostVideo(io), 30 * 60 * 1000);

  // Primera ejecución con delay de 30s
  setTimeout(() => runBotCycle(io), 30 * 1000);
  setTimeout(() => botPostVideo(io), 60 * 1000);

  console.log('✅ Motor de bots de IA activo');
}

module.exports = { startBotEngine, initializeBots, botJoinLive, generateChatMessage };
