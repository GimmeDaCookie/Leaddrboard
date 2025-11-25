const express = require('express');
const router = express.Router();
const Song = require('../models/Song');

// @route   GET api/songs
// @desc    Get all songs
// @access  Public
router.get('/', async (req, res) => {
  try {
    const songs = await Song.find();
    res.json(songs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/songs/:name
// @desc    Get song by name
// @access  Public
router.get('/:name', async (req, res) => {
  try {
    const song = await Song.findOne({ title: req.params.name });

    if (!song) {
      return res.status(404).json({ msg: 'Song not found' });
    }
    res.json(song);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
