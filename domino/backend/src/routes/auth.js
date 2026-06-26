const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const sign = (id) => jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, country, city, flag, lat, lng } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Campos obligatorios: username, email, password' });
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ error: 'Email o username ya en uso' });
    const user = await User.create({ username, email, password, country: country||'', city: city||'', flag: flag||'🌍', lat: lat||null, lng: lng||null });
    res.status(201).json({ token: sign(user._id), user: user.toPublic() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ error: 'Credenciales incorrectas' });
    res.json({ token: sign(user._id), user: user.toPublic() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (!user) {
      const baseUsername = (name || email.split('@')[0]).replace(/\s+/g, '').toLowerCase().slice(0, 20);
      let username = baseUsername;
      let counter = 1;
      while (await User.findOne({ username })) { username = `${baseUsername}${counter++}`; }
      user = await User.create({ username, email, googleId, avatarUrl: picture || '', password: '' });
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (!user.avatarUrl && picture) user.avatarUrl = picture;
      await user.save();
    }
    res.json({ token: sign(user._id), user: user.toPublic() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
