const mongoose = require('mongoose');

const liveSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 300 },
  roomName: { type: String, required: true, unique: true },
  livekitToken: { type: String },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  viewerCount: { type: Number, default: 0 },
  peakViewerCount: { type: Number, default: 0 },
  totalGiftsReceived: { type: Number, default: 0 },
  thumbnailUrl: { type: String, default: '' },
  category: { type: String, enum: ['Creativity', 'Kindness', 'Eco', 'Battle', 'General'], default: 'General' },
  isBattle: { type: Boolean, default: false },
  battleOpponentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  battleScore: {
    host: { type: Number, default: 0 },
    opponent: { type: Number, default: 0 }
  },
  endedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Live', liveSchema);
