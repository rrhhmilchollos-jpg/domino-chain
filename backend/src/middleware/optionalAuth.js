const jwt = require('jsonwebtoken');
const User = require('../models/User');
// Igual que auth.js, pero si no hay token (o es inválido) deja pasar la petición
// con req.user = null, en vez de bloquearla. Útil para rutas públicas que
// quieren comportarse distinto si quien pregunta está logueado o es el dueño.
module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -pushSubscription');
    req.user = user || null;
    next();
  } catch (e) {
    req.user = null;
    next();
  }
};
