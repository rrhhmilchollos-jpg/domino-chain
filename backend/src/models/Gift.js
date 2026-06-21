const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  liveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Live', required: true },
  giftType: {
    type: String,
    enum: ['domino', 'chain', 'star', 'rocket', 'crown', 'diamond'],
    required: true
  },
  coins: { type: Number, required: true }, // cost in coins
  quantity: { type: Number, default: 1 }
}, { timestamps: true });

// Gift catalog — coins value
const GIFT_CATALOG = {
  domino:  { name: 'Dominó',   emoji: '🁣', coins: 5,    points: 10  },
  chain:   { name: 'Cadena',   emoji: '⛓️', coins: 20,   points: 50  },
  star:    { name: 'Estrella', emoji: '⭐', coins: 50,   points: 100 },
  rocket:  { name: 'Cohete',   emoji: '🚀', coins: 100,  points: 200 },
  crown:   { name: 'Corona',   emoji: '👑', coins: 500,  points: 1000 },
  diamond: { name: 'Diamante', emoji: '💎', coins: 1000, points: 2500 }
};

giftSchema.statics.CATALOG = GIFT_CATALOG;

module.exports = mongoose.model('Gift', giftSchema);
