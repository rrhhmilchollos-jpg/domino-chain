const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    if (!req.user) return res.status(401).json({ error: 'Usuario no encontrado' });
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};
