const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  avatarUrl: { type: String, default: '' },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  flag: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 200 },
  impactPoints: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  lastActiveDate: { type: Date },
  pushSubscription: { type: Object },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(pwd) {
  return bcrypt.compare(pwd, this.password);
};

userSchema.methods.toPublic = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.pushSubscription;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
