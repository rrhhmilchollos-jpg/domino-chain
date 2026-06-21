const mongoose = require('mongoose');

// Una fila por (video, usuario) — el índice único hace que un mismo usuario
// nunca cuente dos veces como "persona alcanzada" para el mismo video, sin
// importar cuántas veces lo vuelva a ver. Esto es lo que da el número de
// "personas reales alcanzadas" del Fondo de Creadores, distinto del
// contador simple de reproducciones (Video.viewsCount).
const videoViewSchema = new mongoose.Schema({
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

videoViewSchema.index({ videoId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('VideoView', videoViewSchema);
