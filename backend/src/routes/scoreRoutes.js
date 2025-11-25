const express = require('express');
const router = express.Router();
const Score = require('../models/Score');
const Song = require('../models/Song');

const User = require('../models/User');

// @route   GET api/scores
// @desc    Get all scores
// @access  Public
router.get('/', async (req, res) => {
  try {
    const scores = await Score.find().populate('user', ['username']).populate('song', ['title', 'series']).populate('arcade', ['name']);
    res.json(scores);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/scores/user/:username
// @desc    Get scores for a specific user
// @access  Public
router.get('/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const scores = await Score.find({ user: user._id }).populate('song', ['title', 'series']).populate('arcade', ['name']).populate('user', ['username']);
    res.json(scores);
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error')
  }
});

// @route   GET api/scores/:songId
// @desc    Get scores for a specific song
// @access  Public
router.get('/:songId', async (req, res) => {
  try {
    const scores = await Score.find({
      song: req.params.songId,
    }).populate('user', ['username']).populate('arcade', ['name']);
    res.json(scores);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/scores/:songId/:difficultyName
// @desc    Get scores for a specific song and difficulty
// @access  Public
router.get('/:songId/:difficultyName', async (req, res) => {
  try {
    const scores = await Score.find({
      song: req.params.songId,
      difficultyName: req.params.difficultyName,
    }).populate('user', ['username']).populate('arcade', ['name']);
    res.json(scores);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

const { protect } = require('../middleware/authMiddleware');

// ... (other routes)

const { validateScore } = require('../middleware/validation');
const { scoreLimiter } = require('../middleware/rateLimiter');

// @route   DELETE api/scores/:id
// @desc    Delete a score
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const score = await Score.findById(req.params.id);

    if (!score) {
      return res.status(404).json({ msg: 'Score not found' });
    }

    // Check user
    if (score.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await score.deleteOne();

    res.json({ msg: 'Score removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Score not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/scores
// @desc    Add a new score
// @access  Private
router.post('/', [protect, scoreLimiter, validateScore], async (req, res) => {
  const { songId, arcadeId, rawScore, difficultyName } = req.body;

  try {
    const song = await Song.findOne({ _id: songId });
    if (!song) {
      return res.status(404).json({ msg: 'Song not found' });
    }

    const difficulty = song.difficulties.find(d => d.name === difficultyName);
    if (!difficulty) {
      return res.status(400).json({ msg: 'Difficulty not found for this song' });
    }

    const newScore = new Score({
      user: req.user._id, // Use the authenticated user's ID
      song: songId,
      arcade: arcadeId,
      rawScore,
      difficultyName,
      difficultyScore: difficulty.score,
    });

    const score = await newScore.save();
    res.json(score);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
