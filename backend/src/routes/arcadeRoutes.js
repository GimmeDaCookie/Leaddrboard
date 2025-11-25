const express = require('express');
const router = express.Router();
const Arcade = require('../models/Arcade');

// @route   GET api/arcades
// @desc    Get all arcades
// @access  Public
router.get('/', async (req, res) => {
  try {
    const arcades = await Arcade.find();
    res.json(arcades);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/arcades/:name
// @desc    Get arcade by name
// @access  Public
router.get('/:name', async (req, res) => {
  try {
    const arcade = await Arcade.findOne({ name: req.params.name });

    if (!arcade) {
      return res.status(404).json({ msg: 'Arcade not found' });
    }

    res.json(arcade);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
