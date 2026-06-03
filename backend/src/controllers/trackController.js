const Track = require('../models/Track');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

const getAllTracks = async (req, res) => {
  try {
    const tracks = await Track.find().populate('uploadedBy', 'username');
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTracksByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const tracks = await Track.find({ category }).populate('uploadedBy', 'username');
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTrackById = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id).populate('uploadedBy', 'username');
    if (!track) {
      return res.status(404).json({ message: '音乐不存在' });
    }
    res.json(track);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTrack = async (req, res) => {
  try {
    const { name, artist, album, duration, url, platform, category, tags } = req.body;
    const existingTrack = await Track.findOne({ url });
    if (existingTrack) {
      return res.status(200).json(existingTrack);
    }

    const track = await Track.create({
      name,
      artist,
      album,
      duration,
      url,
      platform,
      category,
      tags: tags || [],
      uploadedBy: req.user._id,
    });

    res.status(201).json(track);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTrack = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({ message: '音乐不存在' });
    }

    if (track.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权修改此音乐' });
    }

    const { name, artist, album, duration, url, platform, category, tags } = req.body;

    if (name) track.name = name;
    if (artist) track.artist = artist;
    if (album) track.album = album;
    if (duration) track.duration = duration;
    if (url) track.url = url;
    if (platform) track.platform = platform;
    if (category) track.category = category;
    if (tags) track.tags = tags;
    track.updatedAt = Date.now();

    const updatedTrack = await track.save();
    res.json(updatedTrack);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTrack = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({ message: '音乐不存在' });
    }

    if (track.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权删除此音乐' });
    }

    if (track.platform === 'upload' && track.url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../', track.url);
      fs.unlink(filePath, (err) => {
        if (err) console.error('删除文件失败:', err);
      });
    }

    await track.deleteOne();
    res.json({ message: '音乐删除成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchTracks = async (req, res) => {
  try {
    const { q } = req.query;
    const tracks = await Track.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { artist: { $regex: q, $options: 'i' } },
        { album: { $regex: q, $options: 'i' } },
      ],
    }).populate('uploadedBy', 'username');
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const incrementPlays = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) {
      return res.status(404).json({ message: '音乐不存在' });
    }
    track.plays += 1;
    await track.save();
    res.json({ plays: track.plays });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllTracks,
  getTracksByCategory,
  getTrackById,
  createTrack,
  updateTrack,
  deleteTrack,
  searchTracks,
  incrementPlays,
};
