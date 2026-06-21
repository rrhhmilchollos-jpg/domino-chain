const router = require('express').Router();
const auth = require('../middleware/auth');
const Video = require('../models/Video');
const VideoView = require('../models/VideoView');

// ======================= FONDO DE CREADORES =======================
// IMPORTANTE — léase antes de tocar nada de esto:
// Esto calcula un saldo REAL a partir de métricas REALES (vistas, alcance
// único, veces compartido), pero NO mueve dinero. Pagar dinero de verdad a
// un usuario requiere una pasarela de pagos para creadores (tipo Stripe
// Connect) con verificación de identidad, cumplimiento legal anti-blanqueo
// e informes fiscales — y sobre todo, una cuenta con fondos reales detrás.
// payoutsActive queda en false a propósito hasta que eso exista de verdad.
// Cuando se conecte una pasarela real, este mismo cálculo sirve de base
// para decidir cuánto transferir a cada creador.

const MIN_REACH = 1000;            // personas únicas reales para ser elegible
const MIN_VIEWS = 5000;            // o esta cantidad de reproducciones
const MIN_SHARES = 200;            // o esta cantidad de veces compartido
const RATE_PER_1000_VIEWS = 0.40;  // € — referencia orientativa tipo CPM de creador
const RATE_PER_SHARE = 0.01;       // € por cada vez compartido

function computeEarnings(video, reach) {
  const eligible = reach >= MIN_REACH || (video.viewsCount || 0) >= MIN_VIEWS || (video.sharesCount || 0) >= MIN_SHARES;
  if (!eligible) return { eligible: false, earnings: 0 };
  const earnings = ((video.viewsCount || 0) / 1000) * RATE_PER_1000_VIEWS + (video.sharesCount || 0) * RATE_PER_SHARE;
  return { eligible: true, earnings: Math.round(earnings * 100) / 100 };
}

// GET /api/creatorfund/me — desglose real por video + saldo acumulado
router.get('/me', auth, async (req, res) => {
  try {
    const videos = await Video.find({ userId: req.user._id, isPublished: true })
      .select('caption thumbnailUrl viewsCount sharesCount likes chainDepth createdAt');
    const videoIds = videos.map(v => v._id);

    const reachAgg = videoIds.length
      ? await VideoView.aggregate([
          { $match: { videoId: { $in: videoIds } } },
          { $group: { _id: '$videoId', reach: { $sum: 1 } } }
        ])
      : [];
    const reachMap = Object.fromEntries(reachAgg.map(r => [r._id.toString(), r.reach]));

    let totalEarnings = 0;
    const breakdown = videos.map(v => {
      const reach = reachMap[v._id.toString()] || 0;
      const { eligible, earnings } = computeEarnings(v, reach);
      totalEarnings += earnings;
      return {
        videoId: v._id,
        caption: v.caption,
        thumbnailUrl: v.thumbnailUrl,
        views: v.viewsCount || 0,
        shares: v.sharesCount || 0,
        reach,
        eligible,
        earnings
      };
    });

    res.json({
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      currency: 'EUR',
      payoutsActive: false, // se pondrá a true el día que haya una pasarela de pagos real conectada
      thresholds: { minReach: MIN_REACH, minViews: MIN_VIEWS, minShares: MIN_SHARES },
      rates: { perThousandViews: RATE_PER_1000_VIEWS, perShare: RATE_PER_SHARE },
      videos: breakdown.sort((a, b) => b.earnings - a.earnings)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
