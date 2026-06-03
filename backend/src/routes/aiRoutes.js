const express = require('express');
const router = express.Router();
const { getRecommendation, searchMusic } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/recommendation', protect, getRecommendation);
router.get('/search', protect, searchMusic);

module.exports = router;