const router = require('express').Router();
const Challenge = require('../models/Challenge');
const Video = require('../models/Video');
const auth = require('../middleware/auth');
const { DOMINO_CHALLENGES, getDailyChallenge, getWeeklyChallenge } = require('../data/challenges');

const seedChallenges = async () => {
  try {
    const count = await Challenge.countDocuments();
    if (count === 0) {
      const now = new Date();
      const docs = DOMINO_CHALLENGES.map((c, i) => ({
        title: c.title,
        description: c.description,
        category: c.category,
        hashtag: c.id,
        difficulty: c.difficulty === 'facil' ? 'easy' : c.difficulty === 'medio' ? 'medium' : 'hard',
        pointsReward: c.points,
        globalCounter: Math.floor(Math.random() * 50000),
        isFeatured: !!c.is_featured,
        badge: c.badge,
        tags: c.tags,
        viral_hook: c.viral_hook,
        nomination_count: c.nomination_count,
        duration: c.duration,
        status: 'active',
        expiresAt: new Date(now.getTime() + 365 * 24 * 3600000),
        activatedAt: new Date(now.getTime() - i * 3600000),
        metadata: { domino_id: c.id, day_of_week: c.day_of_week },
      }));
      await Challenge.insertMany(docs);
      console.log(`✅ Sembrados ${docs.length} retos DOMINO`);
    }
  } catch (e) { console.error('Error sembrando retos:', e.message); }
};
seedChallenges();

router.get('/daily', async (req, res) => {
  try {
    const daily = getDailyChallenge();
    let challenge = await Challenge.findOne({ 'metadata.domino_id': daily.id });
    if (!challenge) { await seedChallenges(); challenge = await Challenge.findOne({ isFeatured: true }).sort({ activatedAt: -1 }); }
    res.json(challenge);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/weekly', async (req, res) => {
  try {
    const weekly = getWeeklyChallenge();
    let challenge = await Challenge.findOne({ 'metadata.domino_id': weekly.id });
    if (!challenge) challenge = await Challenge.findOne({ status: 'active' }).sort({ globalCounter: -1 });
    res.json(challenge);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/active', async (req, res) => {
  try {
    let challenge = await Challenge.findOne({ status: 'active', isFeatured: true }).sort({ activatedAt: -1 });
    if (!challenge) challenge = await Challenge.findOne({ status: 'active' }).sort({ activatedAt: -1 });
    if (!challenge) { await seedChallenges(); challenge = await Challenge.findOne({ status: 'active' }); }
    res.json(challenge);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/featured', async (req, res) => {
  try {
    let challenges = await Challenge.find({ status: 'active', isFeatured: true }).sort({ globalCounter: -1 }).limit(10);
    if (challenges.length === 0) { await seedChallenges(); challenges = await Challenge.find({ isFeatured: true }).limit(10); }
    res.json(challenges);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/categories', (req, res) => {
  res.json([
    { id: 'all', label: 'Todos', emoji: '🌟' },
    { id: 'domino', label: 'DOMINO', emoji: '🎲' },
    { id: 'familia', label: 'Familia', emoji: '👨‍👩‍👧' },
    { id: 'amigos', label: 'Amigos', emoji: '🤝' },
    { id: 'mundial', label: 'Mundial', emoji: '🌍' },
    { id: 'deporte', label: 'Deporte', emoji: '💪' },
    { id: 'creatividad', label: 'Creatividad', emoji: '🎨' },
    { id: 'solidaridad', label: 'Solidaridad', emoji: '💛' },
    { id: 'diario', label: 'Diario', emoji: '📅' },
    { id: 'estacional', label: 'Estacional', emoji: '🌸' },
  ]);
});

router.get('/', async (req, res) => {
  try {
    const { category, status = 'active', limit = 20, page = 1, sort = 'popular' } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (status !== 'all') filter.status = status;
    const sortMap = { popular: { globalCounter: -1 }, new: { activatedAt: -1 }, points: { pointsReward: -1 } };
    let challenges = await Challenge.find(filter).sort(sortMap[sort] || sortMap.popular).skip((Number(page)-1)*Number(limit)).limit(Number(limit));
    if (challenges.length === 0) { await seedChallenges(); challenges = await Challenge.find(filter).limit(Number(limit)); }
    const total = await Challenge.countDocuments(filter);
    res.json({ challenges, total, page: Number(page), pages: Math.ceil(total/Number(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Reto no encontrado' });
    const videoCount = await Video.countDocuments({ challengeId: req.params.id, isPublished: true });
    const topVideos = await Video.find({ challengeId: req.params.id, isPublished: true })
      .populate('userId', 'username avatarUrl flag isVerified').sort({ likes: -1 }).limit(5);
    res.json({ ...challenge.toObject(), videoCount, topVideos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/videos', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const videos = await Video.find({ challengeId: req.params.id, isPublished: true })
      .populate('userId', 'username avatarUrl flag isVerified')
      .sort({ likes: -1, createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    const total = await Video.countDocuments({ challengeId: req.params.id, isPublished: true });
    res.json({ videos, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/nominate', auth, async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) return res.status(400).json({ error: 'userIds requerido' });
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Reto no encontrado' });
    await Challenge.findByIdAndUpdate(req.params.id, { $inc: { globalCounter: userIds.length } });
    const Notification = require('../models/Notification');
    const User = require('../models/User');
    const nominator = await User.findById(req.user.id).select('username avatarUrl');
    const notifications = userIds.map(userId => ({
      userId, type: 'challenge_nomination',
      message: `${nominator.username} te ha nominado para el reto "${challenge.title}" ${challenge.badge || '🎲'}`,
      data: { challengeId: challenge._id, challengeTitle: challenge.title, nominatorId: req.user.id, nominatorUsername: nominator.username, nominatorAvatar: nominator.avatarUrl, badge: challenge.badge },
    }));
    await Notification.insertMany(notifications);
    res.json({ success: true, nominated: userIds.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/complete', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Reto no encontrado' });
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user.id, { $inc: { points: challenge.pointsReward, totalChains: 1 } });
    await Challenge.findByIdAndUpdate(req.params.id, { $inc: { globalCounter: 1 } });
    res.json({ success: true, pointsEarned: challenge.pointsReward, message: `¡Reto completado! +${challenge.pointsReward} puntos` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
