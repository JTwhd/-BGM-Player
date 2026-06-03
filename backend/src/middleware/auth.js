const { verifyToken } = require('../config/jwt');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: '请先登录' });
  }

  try {
    const decoded = verifyToken(authorization.split(' ')[1]);
    if (!decoded) return res.status(401).json({ message: '登录状态已失效' });

    const user = await User.findById(decoded.id).select('-password -deepseekApiKey');
    if (!user) return res.status(401).json({ message: '用户不存在' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: '登录状态已失效' });
  }
};

const admin = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ message: '需要管理员权限' });
};

module.exports = { protect, admin };
