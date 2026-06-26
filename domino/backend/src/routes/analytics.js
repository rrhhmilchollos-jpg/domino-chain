/**
 * DOMINO Analytics Routes
 * Endpoints para monitorear el tráfico del feed y métricas del sistema
 */

const router = require('express').Router();
const { getFeedMetrics, getGlobalMetrics } = require('../middleware/analytics');
const Video = require('../models/Video');
const User = require('../models/User');
const Live = require('../models/Live');
const Gift = require('../models/Gift');

// GET /api/analytics/feed — métricas del endpoint /api/videos/feed
router.get('/feed', async (req, res) => {
  try {
    const feedMetrics = getFeedMetrics();
    res.json({
      endpoint: '/api/videos/feed',
      metrics: feedMetrics,
      timestamp: new Date().toISOString(),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/analytics/global — métricas globales de todos los endpoints
router.get('/global', async (req, res) => {
  try {
    const globalMetrics = getGlobalMetrics();
    res.json({
      metrics: globalMetrics,
      timestamp: new Date().toISOString(),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/analytics/dashboard — resumen completo del sistema
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalVideos,
      totalUsers,
      totalBots,
      activeLives,
      botLives,
      totalGifts,
      feedMetrics,
      globalMetrics,
    ] = await Promise.all([
      Video.countDocuments({ isPublished: true }),
      User.countDocuments({ isBot: false }),
      User.countDocuments({ isBot: true }),
      Live.countDocuments({ isActive: true }),
      Live.countDocuments({
        isActive: true,
        userId: { $in: (await User.find({ isBot: true }).select('_id')).map(u => u._id) }
      }),
      Gift.countDocuments({ isBot: true }),
      Promise.resolve(getFeedMetrics()),
      Promise.resolve(getGlobalMetrics()),
    ]);

    // Top 5 lives activos
    const topLives = await Live.find({ isActive: true })
      .populate('userId', 'username avatarUrl isBot isVerified')
      .sort({ viewerCount: -1 })
      .limit(5)
      .select('title viewerCount totalGifts createdAt');

    res.json({
      system: {
        totalVideos,
        totalUsers,
        totalBots,
        activeLives,
        botLives,
        realUserLives: activeLives - botLives,
        totalBotGifts: totalGifts,
      },
      feed: {
        totalRequests: feedMetrics.totalRequests,
        avgResponseTime: feedMetrics.avgResponseTime,
        avgResponseTimeLast5Min: feedMetrics.avgResponseTimeLast5Min,
        requestsPerMinute: feedMetrics.requestsPerMinute,
        successRate: feedMetrics.totalRequests > 0
          ? ((feedMetrics.successRequests / feedMetrics.totalRequests) * 100).toFixed(1) + '%'
          : '100%',
        lastHourRequests: feedMetrics.lastHourCount,
        statusCodes: feedMetrics.statusCodes,
      },
      topEndpoints: globalMetrics.topEndpoints,
      topLives,
      timestamp: new Date().toISOString(),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
