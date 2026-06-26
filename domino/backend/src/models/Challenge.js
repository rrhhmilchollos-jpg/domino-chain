const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title:          { type: String, required: true },
  description:    { type: String, required: true },
  category:       { type: String, enum: ['Creativity', 'Kindness', 'Eco', 'Sport', 'Music', 'Dance', 'Food', 'Travel', 'Comedy', 'Education'], required: true },
  activatedAt:    { type: Date, default: Date.now },
  expiresAt:      { type: Date, required: true },
  globalCounter:  { type: Number, default: 0 },
  status:         { type: String, enum: ['active', 'expired'], default: 'active' },
  coverImageUrl:  { type: String, default: '' },
  hashtag:        { type: String, default: '' },
  difficulty:     { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  pointsReward:   { type: Number, default: 100 },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isFeatured:     { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
