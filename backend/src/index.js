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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', credentials: false }));

// El webhook de Stripe necesita el body SIN parsear para poder verificar la
// firma (stripe-signature). Tiene que ir ANTES de express.json() global, si
// no, cuando llegue aquí el body ya estaría parseado como objeto y la
// verificación de firma fallaría siempre.
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

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '2.0.0'
}));

// Conectar MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/domino')
  .then(() => {
    console.log('✅ MongoDB conectado');
    app.listen(PORT, () => console.log(`🚀 Backend DOMINO v2.0 en http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ Error MongoDB:', err.message);
    process.exit(1);
  });
