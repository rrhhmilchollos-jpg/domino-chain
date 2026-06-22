const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:       { type: String, required: true, maxlength: 1000 },
  read:       { type: Boolean, default: false },
  videoRef:   { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
