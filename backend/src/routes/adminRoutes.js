const express = require('express');
const { getOverview, getUsers } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.use(protect, admin);
router.get('/overview', getOverview);
router.get('/users', getUsers);

module.exports = router;
