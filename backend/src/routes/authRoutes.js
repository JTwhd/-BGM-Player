const express = require('express');
const router = express.Router();
const { register, login, getMe, updateUser, changePassword, qqLogin, qqConnect, qqDisconnect } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/update', protect, updateUser);
router.put('/change-password', protect, changePassword);

router.post('/qq/login', qqLogin);
router.post('/qq/connect', protect, qqConnect);
router.post('/qq/disconnect', protect, qqDisconnect);

module.exports = router;