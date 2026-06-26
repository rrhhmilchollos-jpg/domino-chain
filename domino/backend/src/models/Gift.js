const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
  liveId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Live', required: true },
  fromUserId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  giftType:    { type: String, enum: ['heart','fire','star','confetti','panda','domino','chain','mermaid','money_gun','airplane','diamond','crown','lion','galaxy','universe','rocket','bomb'], required: true },
  coins:       { type: Number, required: true },
  points:      { type: Number, required: true },
  quantity:    { type: Number, default: 1 },
  isBot:       { type: Boolean, default: false },
}, { timestamps: true });

giftSchema.index({ liveId: 1, createdAt: -1 });
module.exports = mongoose.model('Gift', giftSchema);
