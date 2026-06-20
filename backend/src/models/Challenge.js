const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['Creativity', 'Kindness', 'Eco'], required: true },
  activatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  globalCounter: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'expired'], default: 'active' },
  coverImageUrl: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
