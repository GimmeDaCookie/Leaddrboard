const express = require('express');
const router = express.Router();
const Score = require('../models/Score');
const Song = require('../models/Song');

const User = require('../models/User');
const multer = require('multer');
const vision = require('@google-cloud/vision');
const { imageExtractionLimiter } = require('../middleware/rateLimiter');
const { extractRhythmGameData } = require('../utils/parser');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Vision client
const client = new vision.ImageAnnotatorClient();

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
    console.error(err.message);
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
// @route   POST api/scores/extract-from-image
// @desc    Extract score data from an image
// @access  Private
router.post('/extract-from-image', [protect, imageExtractionLimiter, upload.single('image')], async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No image uploaded' });
  }

  try {
    const [result] = await client.textDetection(req.file.buffer);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return res.status(400).json({ msg: 'No text detected in image' });
    }

    const fullText = detections[0].description;
    
    // Fetch all song titles to use for matching
    const songs = await Song.find({}, 'title');
    const songTitles = songs.map(s => s.title);

    // Use the parser utility
    const extractedData = extractRhythmGameData(result, songTitles);

    let matchedSong = null;
    let matchedDifficulty = null;

    if (extractedData["Song Title"]) {
        // Find the full song object
        matchedSong = await Song.findOne({ title: extractedData["Song Title"] });
        
        if (matchedSong && extractedData["Difficulty Name"]) {
            // The parser gives us a generic name like "BASIC", "EXPERT", etc.
            // We need to find the actual difficulty in the song's difficulties array
            const extractedName = extractedData["Difficulty Name"].toUpperCase();
            const extractedLevel = extractedData["Difficulty Level"] ? parseInt(extractedData["Difficulty Level"], 10) : null;
            
            console.log('Looking for difficulty:', extractedName, 'level:', extractedLevel);
            console.log('Available difficulties:', matchedSong.difficulties.map(d => `${d.name} (${d.score})`));
            
            // Strategy: Match by difficulty name (BASIC, DIFFICULT, EXPERT, etc.)
            // The extracted level might be wrong due to OCR errors, so we trust the name
            // and use whatever level that difficulty actually has in the song
            let foundDiff = null;
            
            if (extractedName) {
                // Try to find a difficulty that matches the extracted name
                // Look for difficulties that contain the extracted name
                foundDiff = matchedSong.difficulties.find(d => 
                    d.name.toUpperCase().includes(extractedName)
                );
                
                if (foundDiff) {
                    console.log('Match by name:', foundDiff.name, '(actual level:', foundDiff.score, ')');
                    if (extractedLevel && foundDiff.score !== extractedLevel) {
                        console.log('Corrected level from', extractedLevel, 'to', foundDiff.score);
                    }
                } else {
                    console.log('No difficulty found matching name:', extractedName);
                }
            }
            
            // Fallback: If no name match, try matching by level only
            if (!foundDiff && extractedLevel) {
                foundDiff = matchedSong.difficulties.find(d => d.score === extractedLevel);
                if (foundDiff) {
                    console.log('Match by level only:', foundDiff.name, '(score:', extractedLevel, ')');
                } else {
                    console.log('No difficulty found with level:', extractedLevel);
                }
            }
            
            // Assign the matched difficulty if found
            if (foundDiff) {
                matchedDifficulty = foundDiff.name;
                console.log('Final matched difficulty:', matchedDifficulty);
            } else {
                console.log('No matching difficulty found in song');
            }
        }
    }
    
    res.json({
      score: extractedData["Score"],
      song: matchedSong,
      difficulty: matchedDifficulty,
      rawText: fullText, // Optional: keep for debugging if needed
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error: ' + err.message);
  }
});

module.exports = router;
