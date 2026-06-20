const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (id) => jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, country, city, flag } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Campos obligatorios: username, email, password' });
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ error: 'Email o username ya en uso' });
    const user = await User.create({ username, email, password, country, city, flag });
    res.status(201).json({ token: sign(user._id), user: user.toPublic() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ error: 'Credenciales incorrectas' });
    res.json({ token: sign(user._id), user: user.toPublic() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
