const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username:         { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email:            { type: String, required: true, unique: true, lowercase: true },
  password:         { type: String, default: '' },
  googleId:         { type: String, default: null, sparse: true },
  avatarUrl:        { type: String, default: '' },
  coverUrl:         { type: String, default: '' },
  country:          { type: String, default: '' },
  city:             { type: String, default: '' },
  flag:             { type: String, default: '🌍' },
  bio:              { type: String, default: '', maxlength: 200 },
  website:          { type: String, default: '' },
  impactPoints:     { type: Number, default: 0 },
  currentStreak:    { type: Number, default: 0 },
  totalChains:      { type: Number, default: 0 },
  totalNominations: { type: Number, default: 0 },
  totalLikes:       { type: Number, default: 0 },
  lastActiveDate:   { type: Date },
  followers:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedVideos:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  pushSubscription: { type: Object },
  isVerified:       { type: Boolean, default: false },
  isBot:            { type: Boolean, default: false },
  isActive:         { type: Boolean, default: true },
  role:             { type: String, enum: ['user', 'admin'], default: 'user' },
  coins:            { type: Number, default: 100 },
  lat:              { type: Number, default: null },
  lng:              { type: Number, default: null },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
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
