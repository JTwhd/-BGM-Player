const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '请输入用户名'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少需要3个字符'],
    maxlength: [30, '用户名不能超过30个字符'],
  },
  email: {
    type: String,
    required: [true, '请输入邮箱'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址'],
  },
  password: {
    type: String,
    required: [true, '请输入密码'],
    minlength: [6, '密码至少需要6个字符'],
  },
  avatar: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  deepseekApiKey: {
    type: String,
    default: '',
    select: false,
  },
  qqOpenId: {
    type: String,
    unique: true,
    sparse: true,
  },
  qqNickname: {
    type: String,
    default: '',
  },
  qqAvatar: {
    type: String,
    default: '',
  },
  qqConnected: {
    type: Boolean,
    default: false,
  },
  favoriteTracks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Track',
    },
  ],
  victoryTracks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Track',
    },
  ],
  defeatTracks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Track',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
