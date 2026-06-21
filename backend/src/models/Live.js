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
  viewerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // espectadores únicos reales que han entrado en algún momento
  totalGiftsReceived: { type: Number, default: 0 },
  thumbnailUrl: { type: String, default: '' },
  category: { type: String, enum: ['Creativity', 'Kindness', 'Eco', 'Battle', 'General'], default: 'General' },
  isBattle: { type: Boolean, default: false },
  battleOpponentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  battleScore: {
    host: { type: Number, default: 0 },
    opponent: { type: Number, default: 0 }
  },
  egressId: { type: String, default: '' }, // id de la grabación en curso en LiveKit (si está activada)
  recordingUrl: { type: String, default: '' }, // URL del archivo una vez terminada la grabación
  publishedAsVideoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null }, // si se publicó el directo como video normal
  endedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Live', liveSchema);
