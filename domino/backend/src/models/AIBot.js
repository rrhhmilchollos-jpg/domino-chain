const mongoose = require('mongoose');

const aiBotSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name:          { type: String, required: true },
  personality:   { type: String, required: true }, // prompt de personalidad
  avatar:        { type: String, default: '' },
  isActive:      { type: Boolean, default: true },
  // Comportamiento autónomo
  postFrequency: { type: Number, default: 3 }, // horas entre posts
  joinLiveProb:  { type: Number, default: 0.4 }, // probabilidad de entrar en un live (0-1)
  chatStyle:     { type: String, enum: ['friendly','funny','serious','hype','troll'], default: 'friendly' },
  // Estado actual
  currentLiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Live', default: null },
  lastPostAt:    { type: Date, default: null },
  lastLiveJoinAt:{ type: Date, default: null },
  totalPosts:    { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  totalGiftsSent:{ type: Number, default: 0 },
  // Temas de interés (para generar contenido relevante)
  interests:     [{ type: String }],
  language:      { type: String, default: 'es' },
}, { timestamps: true });

module.exports = mongoose.model('AIBot', aiBotSchema);
