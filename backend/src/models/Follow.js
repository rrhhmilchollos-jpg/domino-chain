const mongoose = require('mongoose');

// Una fila = "followerId sigue a followingId". Colección separada en vez de
// arrays dentro de User: así contar seguidores/seguidos es una consulta
// indexada normal y no hay que reescribir documentos de usuario enormes.
const followSchema = new mongoose.Schema({
  followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // quien sigue
  followingId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // a quien sigue
}, { timestamps: true });

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true }); // no se puede seguir dos veces a la misma persona
followSchema.index({ followingId: 1 }); // para contar/listar seguidores rápido
followSchema.index({ followerId: 1 });  // para contar/listar seguidos rápido

module.exports = mongoose.model('Follow', followSchema);
