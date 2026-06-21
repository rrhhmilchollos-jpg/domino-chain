const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const sign = (id) => jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Genera un username válido y único a partir del email/nombre de Google
async function uniqueUsernameFrom(base) {
  let candidate = (base || 'usuario').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'usuario';
  if (candidate.length < 3) candidate = candidate.padEnd(3, '0');
  let username = candidate;
  let i = 0;
  while (await User.findOne({ username })) {
    i++;
    username = `${candidate}${i}`.slice(0, 30);
  }
  return username;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, country, city, flag } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Campos obligatorios: username, email, password' });
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ error: 'Email o username ya en uso' });
    const user = await User.create({ username, email, password, country, city, flag, authProvider: 'local' });
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
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
    if (user.authProvider === 'google' && !user.password) {
      return res.status(401).json({ error: 'Esta cuenta se creó con Google. Usa "Continuar con Google" para entrar.' });
    }
    if (!(await user.comparePassword(password))) return res.status(401).json({ error: 'Credenciales incorrectas' });
    res.json({ token: sign(user._id), user: user.toPublic() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/google — recibe el credential (ID token) de Google Identity Services
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Falta el credential de Google' });
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID no configurado en el servidor' });

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ error: 'Token de Google sin email' });

    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] });

    if (user) {
      // Cuenta ya existente (quizá registrada antes con email/password): vincúlala a Google
      if (!user.googleId) { user.googleId = payload.sub; if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture; await user.save(); }
    } else {
      const username = await uniqueUsernameFrom(payload.name || payload.email.split('@')[0]);
      user = await User.create({
        username,
        email: payload.email.toLowerCase(),
        googleId: payload.sub,
        authProvider: 'google',
        avatarUrl: payload.picture || ''
      });
    }

    res.json({ token: sign(user._id), user: user.toPublic() });
  } catch (e) {
    res.status(401).json({ error: 'No se pudo verificar el inicio de sesión con Google' });
  }
});

module.exports = router;
