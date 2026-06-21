const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stripeSessionId: { type: String, required: true, unique: true },
  packageId: { type: String, required: true },
  coins: { type: Number, required: true },
  amount: { type: Number, required: true }, // céntimos
  currency: { type: String, default: 'eur' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);
