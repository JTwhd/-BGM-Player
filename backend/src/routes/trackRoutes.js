const express = require('express');
const router = express.Router();
const { getAllTracks, getTracksByCategory, getTrackById, createTrack, updateTrack, deleteTrack, searchTracks, incrementPlays } = require('../controllers/trackController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, getAllTracks);
router.get('/category/:category', protect, getTracksByCategory);
router.get('/search', protect, searchTracks);
router.get('/:id', protect, getTrackById);
router.post('/', protect, admin, createTrack);
router.put('/:id', protect, admin, updateTrack);
router.delete('/:id', protect, admin, deleteTrack);
router.post('/:id/plays', incrementPlays);

module.exports = router;
