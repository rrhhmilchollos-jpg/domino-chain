require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const challengeRoutes = require('./routes/challenges');
const videoRoutes = require('./routes/videos');
const notificationRoutes = require('./routes/notifications');
const rankingRoutes = require('./routes/ranking');
const livesRoutes = require('./routes/lives');
const coinsRoutes = require('./routes/coins');
const searchRoutes = require('./routes/search');
const soundsRoutes = require('./routes/sounds');
const creatorfundRoutes = require('./routes/creatorfund');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', credentials: false }));

// El webhook de Stripe necesita el body SIN parsear para verificar la firma.
// Tiene que ir ANTES de express.json() global.
app.post('/api/coins/webhook', express.raw({ type: 'application/json' }), coinsRoutes.stripeWebhookHandler);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/lives', livesRoutes);
app.use('/api/coins', coinsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/sounds', soundsRoutes);
app.use('/api/creatorfund', creatorfundRoutes);

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '2.0.0'
}));

// Limpieza de lives "zombies" al arrancar
// Cuando el servidor se reinicia (deploy, crash, etc.) los lives que estaban
// activos quedan con status:'active' en MongoDB para siempre porque nadie
// los cerró. Esto los marca como 'ended' automáticamente al arrancar,
// igual que hace TikTok con sus sesiones huérfanas.
async function cleanupZombieLives() {
  try {
    const Live = require('./models/Live');
    // Solo limpiar lives con más de 30 minutos de antigüedad — así si el
    // servidor se reinicia durante un live recién creado, no lo mata.
    // Un live de más de 30 min sin señal de LiveKit sí es un zombie real.
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const result = await Live.updateMany(
      { status: 'active', createdAt: { $lt: thirtyMinutesAgo } },
      { status: 'ended', endedAt: new Date() }
    );
    if (result.modifiedCount > 0) {
      console.log(`🧹 Limpiados ${result.modifiedCount} lives zombies (>30min) del reinicio anterior`);
    }
  } catch (e) {
    console.warn('⚠️ No se pudieron limpiar lives zombies:', e.message);
  }
}

// Conectar MongoDB y arrancar servidor
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/domino')
  .then(async () => {
    console.log('✅ MongoDB conectado');

    // Limpiar lives zombies ANTES de arrancar el servidor
    // para que los usuarios nunca vean un live "activo" que en realidad no existe
    await cleanupZombieLives();

    app.listen(PORT, () => console.log(`🚀 Backend DOMINO v2.0 en http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ Error MongoDB:', err.message);
    process.exit(1);
  });
