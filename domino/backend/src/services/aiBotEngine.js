/**
 * DOMINO AI Bot Engine v2.0
 * Bots de IA autónomos en live CONTINUO 24/7:
 * - Crean y mantienen directos propios activos todo el día
 * - Chat con IA (GPT-4o-mini) o frases de fallback
 * - Envían regalos periódicamente
 * - Reaccionan a regalos recibidos
 * - Emiten sonidos y música en el chat
 * - Auto-reconnect si el live cae
 * - Publican vídeos de retos
 * - Monitorizan el feed /api/videos/feed
 */

const OpenAI = require('openai');
const User = require('../models/User');
const Video = require('../models/Video');
const Live = require('../models/Live');
const Gift = require('../models/Gift');
const Notification = require('../models/Notification');
const Challenge = require('../models/Challenge');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Catálogo de regalos (sincronizado con giftCatalog.js) ────────────────
const GIFT_CATALOG = {
  heart:     { name: 'Corazón',           emoji: '❤️',  coins: 1,    points: 2    },
  fire:      { name: 'Fuego',             emoji: '🔥',  coins: 5,    points: 10   },
  star:      { name: 'Estrella',          emoji: '⭐',  coins: 10,   points: 20   },
  confetti:  { name: 'Confeti',           emoji: '🎉',  coins: 15,   points: 30   },
  panda:     { name: 'Panda',             emoji: '🐼',  coins: 20,   points: 40   },
  domino:    { name: 'Dominó',            emoji: '🎲',  coins: 25,   points: 50   },
  chain:     { name: 'Cadena',            emoji: '⛓️',  coins: 50,   points: 100  },
  money_gun: { name: 'Pistola de dinero', emoji: '💰',  coins: 100,  points: 200  },
  airplane:  { name: 'Avión privado',     emoji: '✈️',  coins: 200,  points: 400  },
  diamond:   { name: 'Diamante',          emoji: '💎',  coins: 500,  points: 1000 },
  crown:     { name: 'Corona Real',       emoji: '👑',  coins: 800,  points: 1600 },
};

// ─── Pool de vídeos de bots (Pexels — libre de derechos) ──────────────────
const BOT_VIDEO_POOL = [
  'https://videos.pexels.com/video-files/5198139/5198139-hd_1080_1920_25fps.mp4',
  'https://videos.pexels.com/video-files/6238297/6238297-hd_1080_1920_25fps.mp4',
  'https://videos.pexels.com/video-files/7565433/7565433-hd_1080_1920_25fps.mp4',
  'https://videos.pexels.com/video-files/4491461/4491461-hd_1080_1920_25fps.mp4',
  'https://videos.pexels.com/video-files/3209828/3209828-hd_1080_1920_25fps.mp4',
  'https://videos.pexels.com/video-files/5198139/5198139-uhd_1440_2560_25fps.mp4',
  'https://videos.pexels.com/video-files/6238297/6238297-uhd_1440_2560_25fps.mp4',
  'https://videos.pexels.com/video-files/7565433/7565433-uhd_1440_2560_25fps.mp4',
  'https://videos.pexels.com/video-files/4491461/4491461-uhd_1440_2560_25fps.mp4',
];

// Regalos pequeños que los bots usan frecuentemente (baratos)
const SMALL_GIFTS = ['heart', 'fire', 'star', 'confetti', 'panda', 'domino'];
// Regalos medianos (ocasionales)
const MEDIUM_GIFTS = ['chain', 'money_gun'];

// ─── Sonidos y música que los bots pueden emitir en chat ─────────────────
const BOT_SOUNDS = [
  { emoji: '🎵', text: '🎵 *sonido de dominó cayendo*' },
  { emoji: '🥁', text: '🥁 *redoble de tambores*' },
  { emoji: '🎶', text: '🎶 *música de fondo épica*' },
  { emoji: '🔔', text: '🔔 *ding ding ding*' },
  { emoji: '🎺', text: '🎺 *fanfarria de victoria*' },
  { emoji: '🎸', text: '🎸 *riff de guitarra*' },
  { emoji: '🎹', text: '🎹 *melodía de piano*' },
  { emoji: '🎤', text: '🎤 *beat drop*' },
];

// ─── Personalidades de los bots ───────────────────────────────────────────
const BOT_PERSONALITIES = [
  {
    name: 'DominoKing',
    username: 'dominoking_bot',
    personality: 'Eres DominoKing, el rey de los retos de DOMINO. Eres hype, energético, usas emojis, animas a todos. Hablas en español de España. Máximo 20 palabras por mensaje.',
    chatStyle: 'hype',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DominoKing&backgroundColor=b6e3f4',
    liveTitle: '🎲 DOMINO KING EN VIVO — ¡Retos en directo!',
    liveThumbnail: '',
    interests: ['retos', 'dominó', 'cadenas', 'viral'],
    joinLiveProb: 0.7,
    giftProb: 0.4,
    soundProb: 0.2,
  },
  {
    name: 'CadenaQueen',
    username: 'cadena_queen',
    personality: 'Eres CadenaQueen, una chica divertida y carismática que ama los retos virales. Eres graciosa, usas humor. Hablas en español. Máximo 20 palabras por mensaje.',
    chatStyle: 'funny',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CadenaQueen&backgroundColor=ffd5dc',
    liveTitle: '👑 CADENA QUEEN — ¡Humor y retos!',
    liveThumbnail: '',
    interests: ['viral', 'humor', 'retos', 'baile'],
    joinLiveProb: 0.8,
    giftProb: 0.35,
    soundProb: 0.25,
  },
  {
    name: 'RetoMaster',
    username: 'retomaster_ai',
    personality: 'Eres RetoMaster, experto en retos de DOMINO. Eres serio pero motivador, das consejos, animas a completar retos. Hablas en español. Máximo 20 palabras por mensaje.',
    chatStyle: 'serious',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RetoMaster&backgroundColor=c0aede',
    liveTitle: '💪 RETO MASTER — Consejos y motivación',
    liveThumbnail: '',
    interests: ['retos', 'motivación', 'cadenas', 'nominaciones'],
    joinLiveProb: 0.5,
    giftProb: 0.3,
    soundProb: 0.15,
  },
  {
    name: 'ViralBot',
    username: 'viralbot_domino',
    personality: 'Eres ViralBot, siempre al día de lo más viral. Comentas todo, reaccionas exageradamente, usas slang y emojis. Hablas en español. Máximo 15 palabras por mensaje.',
    chatStyle: 'hype',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ViralBot&backgroundColor=d1f4e0',
    liveTitle: '🚀 VIRAL BOT — ¡Lo más trending ahora!',
    liveThumbnail: '',
    interests: ['viral', 'trending', 'retos', 'memes'],
    joinLiveProb: 0.9,
    giftProb: 0.45,
    soundProb: 0.3,
  },
  {
    name: 'ChainBreaker',
    username: 'chainbreaker_ai',
    personality: 'Eres ChainBreaker, un bot rebelde y gracioso que rompe cadenas de formas inesperadas. Eres creativo y sorprendente. Hablas en español. Máximo 20 palabras por mensaje.',
    chatStyle: 'funny',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChainBreaker&backgroundColor=ffdfbf',
    liveTitle: '⛓️ CHAIN BREAKER — ¡Rompiendo cadenas!',
    liveThumbnail: '',
    interests: ['creatividad', 'sorpresa', 'retos', 'humor'],
    joinLiveProb: 0.6,
    giftProb: 0.38,
    soundProb: 0.22,
  },
];

// ─── Frases de chat (fallback sin API) ───────────────────────────────────
const CHAT_PHRASES = {
  hype:    ['🔥🔥🔥', '¡Esto es una pasada!', '¡Vamos vamos vamos!', '¡El mejor directo de hoy!', '❤️❤️❤️', '¡Qué crack!', '¡No me lo puedo creer!', '🚀🚀', '¡Sigue así!', '¡Increíble!', '¡DOMINO FOREVER! 🎲', '¡Qué nivel tan alto! 🔥', '¡Esto va a ser viral! 🚀'],
  funny:   ['jajajaja 😂', '¡Me muero de risa!', '¡Esto no puede ser real!', '😂😂😂', '¡Eres lo más!', '¡Qué locura!', '¡Me estoy partiendo!', '🤣🤣', '¡Genio!', '¡Jajaja qué bueno!', '¡Eres un meme andante! 😂', '¡No puedo más! 🤣'],
  serious: ['Muy buen reto 👏', 'Técnica perfecta', 'Así se hace', 'Gran cadena', 'Impresionante ejecución', 'Eres un ejemplo', '💪', 'Excelente trabajo', 'Sigue nominando', 'Eso es dedicación real 💪'],
  friendly:['¡Hola a todos! 👋', '¡Qué bonito directo!', '¡Me encanta!', '❤️', '¡Genial!', '¡Sigue así!', '¡Eres increíble!', '¡Gracias por el directo!', '¡Qué talento!', '¡Bravo!'],
};

const GIFT_REACTIONS = {
  heart:     ['¡Gracias por el corazón! ❤️', '¡Te quiero! ❤️❤️', '¡Amor puro! ❤️'],
  fire:      ['¡FUEGO! 🔥🔥🔥', '¡Esto está ardiendo! 🔥', '¡Gracias por el fuego! 🔥'],
  star:      ['¡Gracias por la estrella! ⭐', '¡Eres una estrella! ⭐⭐', '¡Brillante! ⭐'],
  confetti:  ['¡CONFETI! 🎉🎉🎉', '¡Fiesta en el directo! 🎉', '¡Gracias! 🎉'],
  panda:     ['¡PANDA! 🐼🐼', '¡Qué monada! 🐼', '¡Gracias por el panda! 🐼'],
  domino:    ['¡Gracias por el dominó! 🎲', '¡Eres un crack! 🎲🎲', '¡Dominó para el mejor! 🎲'],
  chain:     ['¡CADENA! ⛓️⛓️', '¡La cadena sigue! ⛓️', '¡Gracias por la cadena! ⛓️'],
  money_gun: ['¡PISTOLA DE DINERO! 💰💰💰', '¡Lluvia de monedas! 💰', '¡Gracias! 💰💰'],
  airplane:  ['¡AVIÓN PRIVADO! ✈️✈️✈️', '¡Despegando! ✈️', '¡Gracias por el avión! ✈️'],
  diamond:   ['¡DIAMANTE! 💎💎💎', '¡Eres un diamante! 💎', '¡Gracias! 💎💎'],
  crown:     ['¡CORONA REAL! 👑👑👑', '¡El rey/reina! 👑', '¡Gracias por la corona! 👑'],
};

// ─── Temas de live para los bots ─────────────────────────────────────────
const LIVE_THEMES = [
  '🎲 Retos de DOMINO en directo — ¡Únete!',
  '🔥 Cadenas virales — ¡Participa ahora!',
  '🏆 Ranking de retos — ¡Quién llega más lejos?',
  '💪 Motivación y retos — ¡Tú puedes!',
  '🎉 Fiesta de retos — ¡Todos a participar!',
  '⛓️ La cadena no para — ¡Únete a DOMINO!',
  '🌍 Retos mundiales — ¡España en acción!',
  '🚀 Trending ahora — ¡Los mejores retos!',
  '🎵 Retos con música — ¡Baila y reta!',
  '👑 Los mejores de DOMINO — ¡En directo!',
];

// ─── Estado de los lives de bots ─────────────────────────────────────────
const botLiveState = {};

// ─── Inicializar bots en la base de datos ─────────────────────────────────
async function initializeBots() {
  try {
    for (const botDef of BOT_PERSONALITIES) {
      let bot = await User.findOne({ username: botDef.username });
      if (!bot) {
        bot = await User.create({
          username: botDef.username,
          email: `${botDef.username}@domino-ai.internal`,
          password: require('crypto').randomBytes(32).toString('hex'),
          googleId: null,
          avatarUrl: botDef.avatar,
          bio: `Bot de IA de DOMINO 🤖 | ${botDef.name} | Siempre en directo`,
          isBot: true,
          isVerified: true,
          coins: 50000,
          impactPoints: Math.floor(Math.random() * 10000) + 5000,
          country: 'España',
          flag: '🇪🇸',
          city: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao'][Math.floor(Math.random() * 5)],
        });
        console.log(`🤖 Bot creado: ${botDef.username} (${bot._id})`);
      } else {
        // Asegurar que tiene suficientes monedas para regalos
        if (bot.coins < 5000) {
          await User.findByIdAndUpdate(bot._id, { coins: 50000 });
        }
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

// ─── Generar título de live con IA ────────────────────────────────────────
async function generateLiveTitle(personality) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return LIVE_THEMES[Math.floor(Math.random() * LIVE_THEMES.length)];
    }
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: personality.personality },
        { role: 'user', content: 'Crea un título atractivo y corto para tu directo en DOMINO (máximo 60 caracteres, en español, con emojis). Solo el título, sin comillas.' }
      ],
      max_tokens: 40,
      temperature: 1.0,
    });
    return completion.choices[0]?.message?.content?.trim() || personality.liveTitle;
  } catch {
    return LIVE_THEMES[Math.floor(Math.random() * LIVE_THEMES.length)];
  }
}

// ─── Bot envía un regalo en un live ──────────────────────────────────────
async function botSendGift(botUser, live, io, giftSize = 'small') {
  try {
    const giftPool = giftSize === 'medium' ? MEDIUM_GIFTS : SMALL_GIFTS;
    const giftType = giftPool[Math.floor(Math.random() * giftPool.length)];
    const giftDef = GIFT_CATALOG[giftType];
    if (!giftDef) return;

    const bot = await User.findById(botUser._id);
    if (!bot || bot.coins < giftDef.coins) {
      // Recargar monedas si se quedó sin ellas
      await User.findByIdAndUpdate(botUser._id, { coins: 50000 });
      return;
    }

    await User.findByIdAndUpdate(botUser._id, { $inc: { coins: -giftDef.coins } });
    await User.findByIdAndUpdate(live.userId, {
      $inc: { impactPoints: giftDef.points, coins: Math.floor(giftDef.coins * 0.7) }
    });
    await Live.findByIdAndUpdate(live._id, { $inc: { totalGifts: giftDef.coins } });

    const gift = await Gift.create({
      liveId: live._id,
      fromUserId: botUser._id,
      toUserId: live.userId,
      giftType,
      coins: giftDef.coins,
      points: giftDef.points,
      quantity: 1,
      isBot: true,
    });

    const populated = await Gift.findById(gift._id)
      .populate('fromUserId', 'username avatarUrl flag isBot');

    if (io) {
      io.to(`live:${live._id}`).emit('live_gift', { gift: populated });

      // Reacción automática del bot
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
      }, 1500);
    }

    console.log(`🎁 Bot ${botUser.username} envió regalo ${giftType} (${giftDef.coins} coins) en live ${live._id}`);
  } catch (e) {
    console.error(`❌ Error bot send gift:`, e.message);
  }
}

// ─── Bot emite un sonido/música en el chat ────────────────────────────────
function botEmitSound(botUser, live, io) {
  try {
    if (!io) return;
    const sound = BOT_SOUNDS[Math.floor(Math.random() * BOT_SOUNDS.length)];
    io.to(`live:${live._id}`).emit('live_message', {
      user: botUser.username,
      userId: botUser._id,
      avatarUrl: botUser.avatarUrl,
      text: sound.text,
      isBot: true,
      type: 'sound',
      soundEmoji: sound.emoji,
      timestamp: new Date().toISOString(),
    });
  } catch {}
}

// ─── Bot entra en un directo de otro usuario ─────────────────────────────
async function botJoinLive(botUser, live, io) {
  try {
    const personality = BOT_PERSONALITIES.find(p => p.username === botUser.username) || BOT_PERSONALITIES[0];

    // Incrementar viewers
    await Live.findByIdAndUpdate(live._id, { $inc: { viewerCount: 1 } });
    if (live.viewerCount > (live.peakViewers || 0)) {
      await Live.findByIdAndUpdate(live._id, { peakViewers: live.viewerCount + 1 });
    }

    // Mensaje de bienvenida
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

    // Mensajes periódicos (5-12 mensajes durante el directo)
    const numMessages = Math.floor(Math.random() * 8) + 5;
    for (let i = 0; i < numMessages; i++) {
      const delay = (i + 1) * (Math.random() * 30000 + 10000); // 10-40s entre mensajes
      setTimeout(async () => {
        try {
          const liveStillActive = await Live.findById(live._id);
          if (!liveStillActive?.isActive) return;

          // A veces emite sonido en vez de mensaje
          if (Math.random() < personality.soundProb) {
            botEmitSound(botUser, live, io);
            return;
          }

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
        } catch {}
      }, delay);
    }

    // Regalo (probabilidad según personalidad)
    if (Math.random() < personality.giftProb) {
      const giftDelay = Math.random() * 45000 + 15000; // 15-60s
      setTimeout(async () => {
        try {
          const liveStillActive = await Live.findById(live._id);
          if (!liveStillActive?.isActive) return;
          const giftSize = Math.random() < 0.2 ? 'medium' : 'small';
          await botSendGift(botUser, live, io, giftSize);
        } catch {}
      }, giftDelay);
    }

    console.log(`🤖 Bot ${botUser.username} entró en directo: ${live.title}`);
  } catch (e) {
    console.error(`❌ Error bot join live:`, e.message);
  }
}

// ─── Bot crea y mantiene su propio live continuo ─────────────────────────
async function botStartOwnLive(botDef, io) {
  try {
    const botUser = await User.findOne({ username: botDef.username });
    if (!botUser) return;

    // Cerrar live anterior si existe
    await Live.updateMany(
      { userId: botUser._id, isActive: true },
      { isActive: false, endedAt: new Date() }
    );

    // Generar título con IA
    const title = await generateLiveTitle(botDef);

    // Crear nuevo live
    const live = await Live.create({
      userId: botUser._id,
      title,
      thumbnailUrl: botDef.avatar,
      roomId: `domino-bot-live-${botUser._id}-${Date.now()}`,
      viewerCount: Math.floor(Math.random() * 50) + 10, // viewers simulados iniciales
      isActive: true,
    });

    botLiveState[botDef.username] = {
      liveId: live._id.toString(),
      startedAt: new Date(),
      messageCount: 0,
      giftCount: 0,
    };

    console.log(`📺 Bot ${botDef.username} inició live: "${title}" (${live._id})`);

    // Mensaje de apertura
    if (io) {
      const openingMsg = await generateChatMessage(botDef, title);
      io.to(`live:${live._id}`).emit('live_message', {
        user: botUser.username,
        userId: botUser._id,
        avatarUrl: botUser.avatarUrl,
        text: `¡Bienvenidos al directo! ${openingMsg}`,
        isBot: true,
        type: 'host_message',
        timestamp: new Date().toISOString(),
      });
    }

    // Programar mensajes periódicos del host (cada 30-90 segundos)
    scheduleBotLiveMessages(botDef, botUser, live, io);

    // Programar regalos entre bots (bots se regalan entre sí)
    scheduleBotCrossGifts(botDef, botUser, live, io);

    // Programar sonidos periódicos
    scheduleBotSounds(botDef, botUser, live, io);

    // Incrementar viewers simulados periódicamente
    scheduleViewerSimulation(live, io);

    return live;
  } catch (e) {
    console.error(`❌ Error bot start own live (${botDef.username}):`, e.message);
  }
}

// ─── Mensajes periódicos del host en su propio live ───────────────────────
function scheduleBotLiveMessages(botDef, botUser, live, io) {
  // Cada 30-90 segundos el bot envía un mensaje en su propio live
  const sendMessage = async () => {
    try {
      const liveDoc = await Live.findById(live._id);
      if (!liveDoc?.isActive) return; // Live cerrado, no continuar

      const msg = await generateChatMessage(botDef, live.title);
      if (io) {
        io.to(`live:${live._id}`).emit('live_message', {
          user: botUser.username,
          userId: botUser._id,
          avatarUrl: botUser.avatarUrl,
          text: msg,
          isBot: true,
          type: 'host_chat',
          timestamp: new Date().toISOString(),
        });
      }

      if (botLiveState[botDef.username]) {
        botLiveState[botDef.username].messageCount++;
      }

      // Programar el siguiente mensaje
      const nextDelay = Math.random() * 60000 + 30000; // 30-90s
      setTimeout(sendMessage, nextDelay);
    } catch {}
  };

  // Primer mensaje a los 15 segundos
  setTimeout(sendMessage, 15000);
}

// ─── Regalos cruzados entre bots ─────────────────────────────────────────
function scheduleBotCrossGifts(botDef, botUser, live, io) {
  const sendCrossGift = async () => {
    try {
      const liveDoc = await Live.findById(live._id);
      if (!liveDoc?.isActive) return;

      // Buscar otro bot para que envíe un regalo
      const otherBots = BOT_PERSONALITIES.filter(b => b.username !== botDef.username);
      if (otherBots.length === 0) return;

      const gifterDef = otherBots[Math.floor(Math.random() * otherBots.length)];
      const gifterUser = await User.findOne({ username: gifterDef.username });
      if (!gifterUser) return;

      await botSendGift(gifterUser, liveDoc, io, 'small');

      // Programar el siguiente regalo cruzado (cada 3-8 minutos)
      const nextDelay = Math.random() * 300000 + 180000; // 3-8 min
      setTimeout(sendCrossGift, nextDelay);
    } catch {}
  };

  // Primer regalo cruzado a los 2-5 minutos
  const firstDelay = Math.random() * 180000 + 120000;
  setTimeout(sendCrossGift, firstDelay);
}

// ─── Sonidos periódicos en el live ────────────────────────────────────────
function scheduleBotSounds(botDef, botUser, live, io) {
  const emitSound = async () => {
    try {
      const liveDoc = await Live.findById(live._id);
      if (!liveDoc?.isActive) return;

      if (Math.random() < botDef.soundProb) {
        botEmitSound(botUser, live, io);
      }

      // Programar el siguiente sonido (cada 2-5 minutos)
      const nextDelay = Math.random() * 180000 + 120000;
      setTimeout(emitSound, nextDelay);
    } catch {}
  };

  // Primer sonido a los 45-90 segundos
  const firstDelay = Math.random() * 45000 + 45000;
  setTimeout(emitSound, firstDelay);
}

// ─── Simulación de viewers en el live ────────────────────────────────────
function scheduleViewerSimulation(live, io) {
  const updateViewers = async () => {
    try {
      const liveDoc = await Live.findById(live._id);
      if (!liveDoc?.isActive) return;

      // Fluctuación natural de viewers (+/- 1-5)
      const delta = Math.floor(Math.random() * 11) - 5; // -5 a +5
      const newCount = Math.max(5, (liveDoc.viewerCount || 10) + delta);
      await Live.findByIdAndUpdate(live._id, { viewerCount: newCount });

      if (io) {
        io.to(`live:${live._id}`).emit('live_viewers_update', {
          liveId: live._id.toString(),
          viewerCount: newCount,
        });
      }

      // Actualizar cada 30-60 segundos
      const nextDelay = Math.random() * 30000 + 30000;
      setTimeout(updateViewers, nextDelay);
    } catch {}
  };

  setTimeout(updateViewers, 30000);
}

// ─── Ciclo de bots visitando lives de otros usuarios ─────────────────────
async function runBotVisitCycle(io) {
  try {
    // Obtener directos activos de usuarios reales (no bots)
    const activeLives = await Live.find({ isActive: true })
      .populate('userId', 'username isBot')
      .sort({ viewerCount: -1 }).limit(10);

    const realLives = activeLives.filter(l => !l.userId?.isBot);
    if (realLives.length === 0) return;

    // Cada bot tiene probabilidad de visitar un live real
    for (const botDef of BOT_PERSONALITIES) {
      if (Math.random() > botDef.joinLiveProb) continue;

      const botUser = await User.findOne({ username: botDef.username });
      if (!botUser) continue;

      const live = realLives[Math.floor(Math.random() * realLives.length)];
      await botJoinLive(botUser, live, io);

      // Solo un bot por ciclo para no saturar
      break;
    }
  } catch (e) {
    console.error('❌ Error en ciclo de visitas de bots:', e.message);
  }
}

// ─── Ciclo de mantenimiento de lives de bots ─────────────────────────────
async function maintainBotLives(io) {
  try {
    for (const botDef of BOT_PERSONALITIES) {
      const botUser = await User.findOne({ username: botDef.username });
      if (!botUser) continue;

      // Verificar si el bot tiene un live activo
      const activeLive = await Live.findOne({ userId: botUser._id, isActive: true });

      if (!activeLive) {
        // El live cayó o no existe — reiniciar
        console.log(`🔄 Bot ${botDef.username} no tiene live activo — reiniciando...`);
        await botStartOwnLive(botDef, io);
        // Esperar 5s entre cada bot para no saturar
        await new Promise(r => setTimeout(r, 5000));
      } else {
        // Live activo — verificar que no lleve más de 6 horas (renovar)
        const liveAge = Date.now() - new Date(activeLive.createdAt).getTime();
        const sixHours = 6 * 60 * 60 * 1000;
        if (liveAge > sixHours) {
          console.log(`🔄 Bot ${botDef.username} — renovando live (6h cumplidas)`);
          await Live.findByIdAndUpdate(activeLive._id, { isActive: false, endedAt: new Date() });
          if (io) io.to(`live:${activeLive._id}`).emit('live_ended', { liveId: activeLive._id.toString() });
          await new Promise(r => setTimeout(r, 2000));
          await botStartOwnLive(botDef, io);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }
  } catch (e) {
    console.error('❌ Error en mantenimiento de lives de bots:', e.message);
  }
}

// ─── Bot publica un vídeo de reto ─────────────────────────────────────────
async function botPostVideo(io) {
  try {
    const result = await Challenge.find({ status: 'active' }).limit(20);
    const challenges = result.length > 0 ? result : await Challenge.find({}).limit(20);
    if (challenges.length === 0) return;

    const botDef = BOT_PERSONALITIES[Math.floor(Math.random() * BOT_PERSONALITIES.length)];
    const botUser = await User.findOne({ username: botDef.username });
    if (!botUser) return;

    const challenge = challenges[Math.floor(Math.random() * challenges.length)];

    const randomVideoUrl = BOT_VIDEO_POOL[Math.floor(Math.random() * BOT_VIDEO_POOL.length)];

    const video = await Video.create({
      userId: botUser._id,
      challengeId: challenge._id,
      videoUrl: randomVideoUrl,
      thumbnailUrl: botUser.avatarUrl,
      caption: `¡Acepto el reto "${challenge.title}"! 🎲 ¿Quién se atreve a continuar la cadena? #DOMINO`,
      isPublished: true,
      isPrivate: false,
      geoCoordinates: {
        lat: 40.4168 + (Math.random() - 0.5) * 10,
        lng: -3.7038 + (Math.random() - 0.5) * 10,
      },
    });

    await User.findByIdAndUpdate(botUser._id, { $inc: { impactPoints: 100 } });
    await Challenge.findByIdAndUpdate(challenge._id, { $inc: { globalCounter: 1 } });

    if (io) {
      io.emit('new_video', { video, isBot: true });
    }
    console.log(`🎬 Bot ${botUser.username} publicó vídeo del reto: ${challenge.title}`);
  } catch (e) {
    console.error('❌ Error bot post video:', e.message);
  }
}

// ─── Iniciar el motor de bots ─────────────────────────────────────────────
async function startBotEngine(io) {
  console.log('🤖 Iniciando motor de bots de IA v2.0 (24/7 live mode)...');

  // 1. Inicializar bots en la BD
  await initializeBots();

  // 2. Iniciar lives de todos los bots (con delay escalonado)
  console.log('📺 Iniciando lives continuos de bots...');
  for (let i = 0; i < BOT_PERSONALITIES.length; i++) {
    setTimeout(async () => {
      await botStartOwnLive(BOT_PERSONALITIES[i], io);
    }, i * 8000); // 8s entre cada bot
  }

  // 3. Mantenimiento de lives cada 5 minutos (auto-reconnect)
  setTimeout(() => {
    setInterval(() => maintainBotLives(io), 5 * 60 * 1000);
  }, BOT_PERSONALITIES.length * 8000 + 30000);

  // 4. Ciclo de visitas a lives reales cada 3 minutos
  setInterval(() => runBotVisitCycle(io), 3 * 60 * 1000);

  // 5. Publicar vídeos de retos cada 20 minutos
  setInterval(() => botPostVideo(io), 20 * 60 * 1000);

  // 6. Primera visita a lives reales a los 2 minutos
  setTimeout(() => runBotVisitCycle(io), 2 * 60 * 1000);

  // 7. Primer vídeo a los 3 minutos
  setTimeout(() => botPostVideo(io), 3 * 60 * 1000);

  console.log('✅ Motor de bots de IA v2.0 activo — lives 24/7 iniciando...');
}

module.exports = { startBotEngine, initializeBots, botJoinLive, generateChatMessage };
