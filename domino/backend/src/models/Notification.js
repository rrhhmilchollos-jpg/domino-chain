const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['nomination', 'chain_continued', 'milestone', 'liked', 'followed', 'comment', 'mention', 'gift', 'live_started'], required: true },
  fromUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
  chainId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
  message:     { type: String, required: true },
  read:        { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
