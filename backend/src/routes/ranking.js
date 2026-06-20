const router = require('express').Router();
const User = require('../models/User');

router.get('/', async (req, res) => {
  try {
    const { period = 'week', limit = 20 } = req.query;
    const users = await User.find({ isActive: true })
      .select('-password -pushSubscription -email')
      .sort({ impactPoints: -1 })
      .limit(Number(limit));
    const ranking = users.map((u, i) => ({ ...u.toObject(), position: i + 1 }));
    res.json(ranking);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
