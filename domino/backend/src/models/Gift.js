const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
  liveId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Live', required: true },
  fromUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  giftType:    { type: String, enum: ['domino','chain','star','rocket','crown','diamond','fire','heart','bomb','galaxy'], required: true },
  coins:       { type: Number, required: true },
  points:      { type: Number, required: true },
  quantity:    { type: Number, default: 1 },
  isBot:       { type: Boolean, default: false },
}, { timestamps: true });

giftSchema.index({ liveId: 1, createdAt: -1 });
module.exports = mongoose.model('Gift', giftSchema);
