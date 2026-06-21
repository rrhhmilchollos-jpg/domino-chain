const mongoose = require('mongoose');
const videoSchema = new mongoose.Schema({
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }, // opcional: los videos publicados desde un live grabado no tienen reto asociado
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoUrl: { type: String, default: '' },
  thumbnailUrl: { type: String, default: '' },
  caption: { type: String, default: '', maxlength: 150 },
  hashtags: [{ type: String }], // extraídas de caption en minúsculas, sin '#', para buscar rápido
  parentVideoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
  rootVideoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  // Dueto/Stitch: referencia al video original + datos del autor ya
  // desnormalizados (username) para no tener que hacer populate anidado
  // cada vez que se pinta el feed.
  remixOf: {
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
    type: { type: String, enum: ['duet', 'stitch'] },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorUsername: { type: String }
  },
  geoCoordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  nominatedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  chainDepth: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPublished: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: true }, // false = solo visible para el propio dueño
  savesCount: { type: Number, default: 0 }, // solo para mostrar el número rápido; el detalle de quién vive en SavedVideo
  commentsCount: { type: Number, default: 0 }, // idem, el detalle de cada comentario vive en la colección Comment
  // Música añadida al grabar — desnormalizado (igual que remixOf) para no
  // tener que consultar el catálogo de sonidos cada vez que se pinta el feed.
  sound: {
    id: { type: String },
    title: { type: String }
  }
}, { timestamps: true });

videoSchema.index({ hashtags: 1 });

module.exports = mongoose.model('Video', videoSchema);
