const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['nomination', 'chain_continued', 'milestone', 'liked', 'battle_invite'], required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  chainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  liveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Live' }, // para notificaciones de tipo battle_invite
  message: { type: String, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
