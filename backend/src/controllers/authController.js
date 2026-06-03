const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const axios = require('axios');

const QQ_CLIENT_ID = process.env.QQ_CLIENT_ID || 'your_qq_app_id';
const QQ_CLIENT_SECRET = process.env.QQ_CLIENT_SECRET || 'your_qq_app_secret';
const QQ_REDIRECT_URI = process.env.QQ_REDIRECT_URI || 'http://localhost:5000/api/auth/qq/callback';

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const serializeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  qqConnected: user.qqConnected,
  qqNickname: user.qqNickname,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    const email = normalizeEmail(req.body.email);

    const userExists = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (userExists) {
      if (userExists.email === email) {
        return res.status(400).json({ message: '该邮箱已被注册' });
      }
      return res.status(400).json({ message: '该用户名已被使用' });
    }

    const user = await User.create({
      username,
      email,
      password,
    });

    if (user) {
      res.status(201).json({ ...serializeUser(user), token: generateToken(user._id) });
    } else {
      res.status(400).json({ message: '创建用户失败' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      res.json({ ...serializeUser(user), token: generateToken(user._id) });
    } else {
      res.status(401).json({ message: '邮箱或密码错误' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -deepseekApiKey');
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { username, email } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return res.status(400).json({ message: '该用户名已被使用' });
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const normalizedEmail = normalizeEmail(email);
      const emailExists = await User.findOne({ email: normalizedEmail });
      if (emailExists) {
        return res.status(400).json({ message: '该邮箱已被注册' });
      }
      user.email = normalizedEmail;
    }

    user.updatedAt = Date.now();
    const updatedUser = await user.save();

    res.json({ ...serializeUser(updatedUser), token: generateToken(updatedUser._id) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: '当前密码错误' });
    }

    user.password = newPassword;
    user.updatedAt = Date.now();
    await user.save();

    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const qqLogin = async (req, res) => {
  try {
    const { code } = req.body;

    const tokenResponse = await axios.get('https://graph.qq.com/oauth2.0/token', {
      params: {
        grant_type: 'authorization_code',
        client_id: QQ_CLIENT_ID,
        client_secret: QQ_CLIENT_SECRET,
        code: code,
        redirect_uri: QQ_REDIRECT_URI,
        fmt: 'json',
      },
    });

    const { access_token, openid } = tokenResponse.data;

    const userInfoResponse = await axios.get('https://graph.qq.com/user/get_user_info', {
      params: {
        access_token: access_token,
        oauth_consumer_key: QQ_CLIENT_ID,
        openid: openid,
      },
    });

    const { nickname, figureurl_qq_1 } = userInfoResponse.data;

    let user = await User.findOne({ qqOpenId: openid });

    if (!user) {
      const randomUsername = 'qq_user_' + Math.random().toString(36).substring(2, 10);
      const randomEmail = randomUsername + '@qqoauth.com';
      const randomPassword = Math.random().toString(36).substring(2, 15);

      user = await User.create({
        username: randomUsername,
        email: randomEmail,
        password: randomPassword,
        qqOpenId: openid,
        qqNickname: nickname,
        qqAvatar: figureurl_qq_1,
        qqConnected: true,
        avatar: figureurl_qq_1,
      });
    } else {
      user.qqNickname = nickname;
      user.qqAvatar = figureurl_qq_1;
      user.qqConnected = true;
      if (!user.avatar) {
        user.avatar = figureurl_qq_1;
      }
      await user.save();
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          plan: user.role === 'admin' ? 'vip' : 'free',
          isActivated: true,
          expiresAt: null,
          qqConnected: true,
          qqNickname: nickname,
        },
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error('QQ登录失败:', error);
    res.status(500).json({ success: false, message: 'QQ登录失败' });
  }
};

const qqConnect = async (req, res) => {
  try {
    const { code } = req.body;

    const tokenResponse = await axios.get('https://graph.qq.com/oauth2.0/token', {
      params: {
        grant_type: 'authorization_code',
        client_id: QQ_CLIENT_ID,
        client_secret: QQ_CLIENT_SECRET,
        code: code,
        redirect_uri: QQ_REDIRECT_URI,
        fmt: 'json',
      },
    });

    const { access_token, openid } = tokenResponse.data;

    const userInfoResponse = await axios.get('https://graph.qq.com/user/get_user_info', {
      params: {
        access_token: access_token,
        oauth_consumer_key: QQ_CLIENT_ID,
        openid: openid,
      },
    });

    const { nickname, figureurl_qq_1 } = userInfoResponse.data;

    const existingUser = await User.findOne({ qqOpenId: openid });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ message: '该QQ账号已绑定其他账户' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    user.qqOpenId = openid;
    user.qqNickname = nickname;
    user.qqAvatar = figureurl_qq_1;
    user.qqConnected = true;
    if (!user.avatar) {
      user.avatar = figureurl_qq_1;
    }
    await user.save();

    res.json({
      message: 'QQ账号绑定成功',
      user: {
        id: user._id,
        email: user.email,
        qqConnected: true,
        qqNickname: nickname,
      },
    });
  } catch (error) {
    console.error('QQ绑定失败:', error);
    res.status(500).json({ message: 'QQ绑定失败' });
  }
};

const qqDisconnect = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    user.qqOpenId = undefined;
    user.qqNickname = '';
    user.qqAvatar = '';
    user.qqConnected = false;
    await user.save();

    res.json({ message: 'QQ账号解绑成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateUser,
  changePassword,
  qqLogin,
  qqConnect,
  qqDisconnect,
};
