const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['Creativity', 'Kindness', 'Eco'], required: true },
  activatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  globalCounter: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'expired'], default: 'active' },
  coverImageUrl: { type: String, default: '' },
  // Retos Diarios: cada día real (UTC, 'YYYY-MM-DD') tiene exactamente 2
  // retos, distinguidos por slot 1/2. dayKey permite consultar el
  // calendario por rango de fechas sin depender de ventanas rodantes de 24h.
  dayKey: { type: String, index: true },
  slot: { type: Number, enum: [1, 2] }
}, { timestamps: true });

challengeSchema.index({ dayKey: 1, slot: 1 }, { unique: true, partialFilterExpression: { dayKey: { $exists: true } } });

module.exports = mongoose.model('Challenge', challengeSchema);
