const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'nomination',
      'chain_continued',
      'milestone',
      'liked',
      'followed',
      'battle_invite',
      'battle_accepted',
      'join_request',    // espectador solicita unirse al live del host
      'join_accepted',   // host acepta la solicitud
      'join_rejected',   // host rechaza la solicitud
      'new_follower'
    ],
    required: true
  },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  chainId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  liveId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Live' },
  message:  { type: String, required: true },
  read:     { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
