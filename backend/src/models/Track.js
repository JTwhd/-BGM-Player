const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '请输入音乐名称'],
    trim: true,
  },
  artist: {
    type: String,
    trim: true,
    default: '',
  },
  album: {
    type: String,
    trim: true,
    default: '',
  },
  duration: {
    type: Number,
    default: 0,
  },
  url: {
    type: String,
    required: [true, '请输入音乐URL'],
  },
  platform: {
    type: String,
    enum: ['netease', 'qq', 'spotify', 'local', 'upload'],
    default: 'local',
  },
  category: {
    type: String,
    enum: ['victory', 'defeat', 'neutral'],
    default: 'neutral',
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  coverUrl: {
    type: String,
    default: '',
  },
  plays: {
    type: Number,
    default: 0,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Track', trackSchema);