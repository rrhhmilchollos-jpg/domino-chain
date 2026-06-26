const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  videoId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true, maxlength: 500 },
  likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  parentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  replyCount:{ type: Number, default: 0 },
}, { timestamps: true });

commentSchema.index({ videoId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
