const mongoose = require('mongoose');

const liveSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true, maxlength: 100 },
  thumbnailUrl: { type: String, default: '' },
  viewerCount:  { type: Number, default: 0 },
  peakViewers:  { type: Number, default: 0 },
  totalGifts:   { type: Number, default: 0 },
  isActive:     { type: Boolean, default: true },
  endedAt:      { type: Date, default: null },
  roomId:       { type: String, default: '' },
}, { timestamps: true });

liveSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Live', liveSchema);
