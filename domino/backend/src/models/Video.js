const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  challengeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videoUrl:       { type: String, default: '' },
  thumbnailUrl:   { type: String, default: '' },
  cloudinaryId:   { type: String, default: '' },
  caption:        { type: String, default: '', maxlength: 300 },
  hashtags:       [{ type: String }],
  musicTitle:     { type: String, default: '' },
  musicArtist:    { type: String, default: '' },
  duration:       { type: Number, default: 15 },
  parentVideoId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
  rootVideoId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
  geoCoordinates: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 }
  },
  nominatedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  chainDepth:     { type: Number, default: 0 },
  likes:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  views:          { type: Number, default: 0 },
  shares:         { type: Number, default: 0 },
  saves:          { type: Number, default: 0 },
  commentCount:   { type: Number, default: 0 },
  isDuet:         { type: Boolean, default: false },
  duetVideoId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
  isPublished:    { type: Boolean, default: true },
  isPrivate:      { type: Boolean, default: false },
  allowComments:  { type: Boolean, default: true },
  allowDuet:      { type: Boolean, default: true },
}, { timestamps: true });

videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ challengeId: 1 });
videoSchema.index({ rootVideoId: 1 });
videoSchema.index({ 'geoCoordinates.lat': 1, 'geoCoordinates.lng': 1 });

module.exports = mongoose.model('Video', videoSchema);
