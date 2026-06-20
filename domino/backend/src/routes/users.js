const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

router.get('/me', auth, (req, res) => res.json(req.user));

router.put('/me', auth, async (req, res) => {
  try {
    const { username, bio, country, city, flag, avatarUrl } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { username, bio, country, city, flag, avatarUrl }, { new: true }).select('-password');
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -pushSubscription');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Guardar push subscription
router.post('/push-subscription', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: req.body });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
