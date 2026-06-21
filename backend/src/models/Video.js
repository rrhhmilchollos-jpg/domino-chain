const mongoose = require('mongoose');
const videoSchema = new mongoose.Schema({
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }, // opcional: los videos publicados desde un live grabado no tienen reto asociado
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoUrl: { type: String, default: '' },
  thumbnailUrl: { type: String, default: '' },
  parentVideoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
  rootVideoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  geoCoordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  nominatedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  chainDepth: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPublished: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: true } // false = solo visible para el propio dueño
}, { timestamps: true });
module.exports = mongoose.model('Video', videoSchema);
