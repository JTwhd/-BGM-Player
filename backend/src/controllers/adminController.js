const User = require('../models/User');
const Track = require('../models/Track');

const getOverview = async (_req, res) => {
  try {
    const [userCount, adminCount, trackCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      Track.countDocuments(),
    ]);

    res.json({ userCount, adminCount, trackCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsers = async (_req, res) => {
  try {
    const users = await User.find()
      .select('username email role createdAt updatedAt qqConnected')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getOverview, getUsers };
