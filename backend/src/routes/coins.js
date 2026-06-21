const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Live = require('../models/Live');
const Gift = require('../models/Gift');
const Purchase = require('../models/Purchase');
const Notification = require('../models/Notification');

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('STRIPE_SECRET_KEY no configurado — compra de monedas desactivada');
}

// Paquetes de monedas en venta. id estable: no lo cambies sin más, queda
// referenciado en compras pasadas (Purchase.packageId).
const COIN_PACKAGES = [
  { id: 'starter', coins: 100, price: 0.99, label: 'Starter', emoji: '🪙' },
  { id: 'popular', coins: 550, price: 4.99, label: 'Popular', emoji: '💰', badge: 'MÁS POPULAR' },
  { id: 'pro', coins: 1200, price: 9.99, label: 'Pro', emoji: '💎' },
  { id: 'whale', coins: 6500, price: 49.99, label: 'Whale', emoji: '👑', badge: 'MEJOR VALOR' },
];

function frontendUrl(req) {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const origin = req?.headers?.origin || req?.headers?.referer;
  if (origin) return origin.replace(/\/$/, '');
  return 'https://www.domino-chain.app'; // último recurso si no hay env var ni cabecera Origin
}

// GET /api/coins/packages
router.get('/packages', (req, res) => res.json(COIN_PACKAGES));

// GET /api/coins/balance
router.get('/balance', auth, (req, res) => res.json({ coins: req.user.coins || 0 }));

// POST /api/coins/checkout — crea una sesión de pago de Stripe y devuelve la URL para redirigir
router.post('/checkout', auth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Los pagos no están disponibles ahora mismo' });
    const { packageId } = req.body;
    const pkg = COIN_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return res.status(400).json({ error: 'Paquete no válido' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: req.user.email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `${pkg.coins.toLocaleString()} monedas DOMINO`, description: pkg.label },
          unit_amount: Math.round(pkg.price * 100),
        },
        quantity: 1,
      }],
      metadata: { userId: req.user._id.toString(), packageId: pkg.id },
      success_url: `${frontendUrl(req)}/coins?success=true`,
      cancel_url: `${frontendUrl(req)}/coins?canceled=true`,
    });

    await Purchase.create({
      userId: req.user._id,
      stripeSessionId: session.id,
      packageId: pkg.id,
      coins: pkg.coins,
      amount: Math.round(pkg.price * 100),
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/coins/gift — enviar un regalo (resta monedas al que envía, suma puntos al streamer)
router.post('/gift', auth, async (req, res) => {
  try {
    const { liveId, giftType, quantity = 1, target = 'host' } = req.body;
    const catalog = Gift.CATALOG;
    if (!catalog[giftType]) return res.status(400).json({ error: 'Tipo de regalo inválido' });
    const qty = Math.max(1, Math.min(99, Number(quantity) || 1));

    const live = await Live.findById(liveId).populate('userId').populate('battleOpponentId');
    if (!live || live.status !== 'active') return res.status(404).json({ error: 'Live no encontrado o terminado' });

    // En batalla el regalo puede ir al host o al rival real (target). Fuera
    // de batalla siempre va al dueño del live.
    const giftingOpponent = live.isBattle && target === 'opponent';
    if (giftingOpponent && !live.battleOpponentId) return res.status(400).json({ error: 'Esta batalla todavía no tiene rival' });
    const recipient = giftingOpponent ? live.battleOpponentId : live.userId;
    if (recipient._id.toString() === req.user._id.toString()) return res.status(400).json({ error: 'No puedes regalarte a ti mismo' });

    const cost = catalog[giftType].coins * qty;

    // Update atómico: solo descuenta si el saldo alcanza (evita gastar más de lo que tienes
    // por condiciones de carrera entre dos regalos enviados casi a la vez).
    const buyer = await User.findOneAndUpdate(
      { _id: req.user._id, coins: { $gte: cost } },
      { $inc: { coins: -cost } },
      { new: true }
    );
    if (!buyer) return res.status(400).json({ error: 'Monedas insuficientes' });

    const gift = await Gift.create({
      fromUserId: req.user._id,
      toUserId: recipient._id,
      liveId: live._id,
      giftType,
      coins: cost,
      quantity: qty,
    });

    const pointsEarned = catalog[giftType].points * qty;
    await User.findByIdAndUpdate(recipient._id, { $inc: { impactPoints: pointsEarned } });
    await Live.findByIdAndUpdate(live._id, { $inc: { totalGiftsReceived: qty } });
    if (live.isBattle) await Live.findByIdAndUpdate(live._id, { $inc: { [`battleScore.${giftingOpponent ? 'opponent' : 'host'}`]: pointsEarned } });

    await Notification.create({
      userId: recipient._id,
      type: 'liked',
      fromUserId: req.user._id,
      videoId: null,
      chainId: null,
      message: `${req.user.username} te ha enviado ${qty}x ${catalog[giftType].name} 🎁`,
    });

    res.status(201).json({ ok: true, gift, newBalance: buyer.coins, pointsEarned });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

// Handler del webhook de Stripe. Se exporta aparte porque necesita montarse
// con el body SIN parsear (express.raw) y ANTES de express.json() global —
// ver src/index.js. Si fuera una ruta normal del router, ya llegaría con el
// body parseado como JSON y la verificación de firma de Stripe fallaría.
router.stripeWebhookHandler = async (req, res) => {
  if (!stripe) return res.status(503).send('Stripe no configurado');
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).send(`Firma de webhook inválida: ${e.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const purchase = await Purchase.findOne({ stripeSessionId: session.id });
      if (purchase && purchase.status !== 'completed') {
        purchase.status = 'completed';
        await purchase.save();
        await User.findByIdAndUpdate(purchase.userId, { $inc: { coins: purchase.coins } });
      }
    } catch (e) {
      console.error('Error procesando webhook de Stripe:', e.message);
    }
  }

  res.json({ received: true });
};
