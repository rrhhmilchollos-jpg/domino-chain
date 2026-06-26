require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/users');
const challengeRoutes    = require('./routes/challenges');
const videoRoutes        = require('./routes/videos');
const notificationRoutes = require('./routes/notifications');
const rankingRoutes      = require('./routes/ranking');
const messageRoutes      = require('./routes/messages');
const liveRoutes         = require('./routes/lives');
const botRoutes          = require('./routes/bots');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://domino-chain.vercel.app',
  'https://domino-chain-pi.vercel.app',
].filter(Boolean);

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
  transports: ['websocket', 'polling'],
});

// Exponer io globalmente para que las rutas puedan emitir eventos
global.io = io;
app.set('io', io);

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rutas ──────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/challenges',    challengeRoutes);
app.use('/api/videos',        videoRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ranking',       rankingRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/lives',         liveRoutes);
app.use('/api/bots',          botRoutes);

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  version: '3.0.0',
  timestamp: new Date().toISOString(),
  features: ['feed-public', 'live-chat', 'gifts', 'ai-bots', 'coins'],
}));

// ── Socket.IO ──────────────────────────────────────────
io.on('connection', (socket) => {
  // Sala personal del usuario
  socket.on('join', (userId) => {
    if (userId) socket.join(String(userId));
  });

  // Chat privado
  socket.on('send_message', (data) => {
    io.to(String(data.toUserId)).emit('new_message', data);
  });

  // Directos
  socket.on('join_live', (liveId) => {
    if (liveId) socket.join(`live:${liveId}`);
  });
  socket.on('leave_live', (liveId) => {
    if (liveId) socket.leave(`live:${liveId}`);
  });

  // Mensaje de chat en directo (desde cliente)
  socket.on('live_message', (data) => {
    if (data?.liveId) {
      io.to(`live:${data.liveId}`).emit('live_message', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Regalo en directo (desde cliente — la lógica real está en la ruta POST)
  socket.on('live_gift', (data) => {
    if (data?.liveId) {
      io.to(`live:${data.liveId}`).emit('live_gift', data);
    }
  });

  // Mensaje flotante del host
  socket.on('live_float', (data) => {
    if (data?.liveId) {
      io.to(`live:${data.liveId}`).emit('live_float', data);
    }
  });

  // Batalla: solicitud de unirse
  socket.on('live_battle_request', (data) => {
    if (data?.liveId) {
      io.to(`live:${data.liveId}`).emit('live_battle_request', data);
    }
  });
  socket.on('live_battle_response', (data) => {
    if (data?.liveId) {
      io.to(`live:${data.liveId}`).emit('live_battle_response', data);
    }
  });

  socket.on('disconnect', () => {});
});

// ── MongoDB + Start ────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/domino')
  .then(async () => {
    console.log('✅ MongoDB conectado');
    server.listen(PORT, () => {
      console.log(`🚀 DOMINO Backend v3 en http://localhost:${PORT}`);
    });

    // Iniciar motor de bots de IA (con delay para que la BD esté lista)
    setTimeout(async () => {
      try {
        const { startBotEngine } = require('./services/aiBotEngine');
        await startBotEngine(io);
      } catch (e) {
        console.error('⚠️ Error iniciando bots:', e.message);
      }
    }, 5000);
  })
  .catch(err => {
    console.error('❌ Error MongoDB:', err.message);
    process.exit(1);
  });
