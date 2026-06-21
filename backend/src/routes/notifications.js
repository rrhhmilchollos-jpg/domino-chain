const router = require('express').Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

router.get('/', auth, async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.user._id })
      .populate('fromUserId', 'username avatarUrl flag')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(notifs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// BUG FIX: read-all DEBE ir ANTES de /:id
// Si va después, Express interpreta "read-all" como un :id y nunca llega aquí
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
