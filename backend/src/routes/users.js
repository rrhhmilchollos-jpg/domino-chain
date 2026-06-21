const router = require('express').Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');

// Marca isFollowing en cada usuario de una lista según quién pregunta (una
// sola consulta batch, no una por usuario) — así el botón "+ Seguir" sale
// correcto desde el primer render en vez de asumir que no le sigues.
async function withIsFollowing(users, requester) {
  if (!requester || users.length === 0) return users.map(u => ({ ...u.toObject(), isFollowing: false }));
  const ids = users.map(u => u._id);
  const myFollows = await Follow.find({ followerId: requester._id, followingId: { $in: ids } }).select('followingId');
  const followingSet = new Set(myFollows.map(f => f.followingId.toString()));
  return users.map(u => ({ ...u.toObject(), isFollowing: followingSet.has(u._id.toString()) }));
}

router.get('/me', auth, async (req, res) => {
  try {
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ followingId: req.user._id }),
      Follow.countDocuments({ followerId: req.user._id }),
    ]);
    res.json({ ...req.user.toObject(), followersCount, followingCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/me', auth, async (req, res) => {
  try {
    const { username, bio, country, city, flag, avatarUrl } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { username, bio, country, city, flag, avatarUrl },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/users/search?q=...
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { country: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } }
      ]
    }).select('-password -pushSubscription -email').limit(20);
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/users/:id — perfil público. optionalAuth para saber si quien
// pregunta ya sigue a este usuario (isFollowing), sin exigir sesión.
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -pushSubscription');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const [followersCount, followingCount, isFollowing] = await Promise.all([
      Follow.countDocuments({ followingId: user._id }),
      Follow.countDocuments({ followerId: user._id }),
      req.user && req.user._id.toString() !== user._id.toString()
        ? Follow.exists({ followerId: req.user._id, followingId: user._id })
        : Promise.resolve(false),
    ]);

    res.json({ ...user.toObject(), followersCount, followingCount, isFollowing: !!isFollowing });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/users/:id/follow — seguir a otra cuenta real (nunca se nomina/inventa)
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user._id.toString()) return res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    // findOneAndUpdate con upsert: si ya lo seguías, no hace nada raro (es idempotente)
    const existing = await Follow.findOne({ followerId: req.user._id, followingId: targetId });
    if (!existing) {
      await Follow.create({ followerId: req.user._id, followingId: targetId });
      await Notification.create({
        userId: targetId,
        type: 'new_follower',
        fromUserId: req.user._id,
        message: `${req.user.username} ha empezado a seguirte`,
      });
    }

    const followersCount = await Follow.countDocuments({ followingId: targetId });
    res.status(201).json({ ok: true, isFollowing: true, followersCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/users/:id/follow — dejar de seguir
router.delete('/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    await Follow.deleteOne({ followerId: req.user._id, followingId: targetId });
    const followersCount = await Follow.countDocuments({ followingId: targetId });
    res.json({ ok: true, isFollowing: false, followersCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/users/:id/followers — cuentas reales que siguen a :id
router.get('/:id/followers', optionalAuth, async (req, res) => {
  try {
    const follows = await Follow.find({ followingId: req.params.id })
      .populate('followerId', 'username avatarUrl flag country city')
      .sort({ createdAt: -1 })
      .limit(200);
    const list = follows.map(f => f.followerId).filter(Boolean);
    res.json(await withIsFollowing(list, req.user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/users/:id/following — cuentas reales a las que sigue :id
router.get('/:id/following', optionalAuth, async (req, res) => {
  try {
    const follows = await Follow.find({ followerId: req.params.id })
      .populate('followingId', 'username avatarUrl flag country city')
      .sort({ createdAt: -1 })
      .limit(200);
    const list = follows.map(f => f.followingId).filter(Boolean);
    res.json(await withIsFollowing(list, req.user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/push-subscription', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { pushSubscription: req.body });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
