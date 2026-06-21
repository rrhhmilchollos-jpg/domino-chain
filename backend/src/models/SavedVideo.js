const mongoose = require('mongoose');

// Una fila = "userId guardó videoId". Colección separada (igual que Follow)
// en vez de un array dentro de Video o User: contar y listar es rápido e
// indexado, y no hace falta reescribir documentos grandes.
const savedVideoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
}, { timestamps: true });

savedVideoSchema.index({ userId: 1, videoId: 1 }, { unique: true }); // no se puede guardar dos veces el mismo video
savedVideoSchema.index({ userId: 1, createdAt: -1 }); // para listar "mis guardados" del más reciente al más antiguo

module.exports = mongoose.model('SavedVideo', savedVideoSchema);
