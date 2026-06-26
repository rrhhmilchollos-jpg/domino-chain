const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message:    { type: String, default: '¡Quiero unirme!' },
  status:     { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { _id: true, timestamps: true });

const liveSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:            { type: String, required: true, maxlength: 100 },
  description:      { type: String, default: '' },
  category:         { type: String, default: 'General' },
  thumbnailUrl:     { type: String, default: '' },
  viewerCount:      { type: Number, default: 0 },
  peakViewers:      { type: Number, default: 0 },
  totalGifts:       { type: Number, default: 0 },
  isActive:         { type: Boolean, default: true },
  endedAt:          { type: Date, default: null },
  roomId:           { type: String, default: null },
  // Batalla VS
  isBattle:         { type: Boolean, default: false },
  battleOpponentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Peticiones de unirse
  joinRequests:     { type: [joinRequestSchema], default: [] },
  // Usuarios bloqueados
  blockedUsers:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Grabación
  recordingUrl:     { type: String, default: '' },
  duration:         { type: Number, default: 0 },
  // Bot flag
  isBot:            { type: Boolean, default: false },
}, { timestamps: true });

liveSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Live', liveSchema);
