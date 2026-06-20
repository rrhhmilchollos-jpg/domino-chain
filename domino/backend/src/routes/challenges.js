const router = require('express').Router();
const Challenge = require('../models/Challenge');

// GET /api/challenges/active — reto del día
router.get('/active', async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ status: 'active', expiresAt: { $gt: new Date() } }).sort({ activatedAt: -1 });
    if (!challenge) {
      // Crear reto de ejemplo si no hay ninguno
      const newChallenge = await Challenge.create({
        title: '30 Segundos de Bondad',
        description: 'Graba un acto espontáneo de amabilidad hacia un desconocido. Sin guión, sin preparación — bondad real.',
        category: 'Kindness',
        expiresAt: new Date(Date.now() + 24 * 3600000),
        globalCounter: 14782
      });
      return res.json(newChallenge);
    }
    res.json(challenge);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/challenges
router.get('/', async (req, res) => {
  try {
    const challenges = await Challenge.find().sort({ activatedAt: -1 }).limit(20);
    res.json(challenges);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
