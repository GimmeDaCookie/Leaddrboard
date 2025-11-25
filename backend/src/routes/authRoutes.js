const express = require('express');
const router = express.Router();
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { check, validationResult } = require('express-validator');

// Middleware to handle validation results
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const { validateUsername, validatePassword } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [authLimiter, validateUsername, validatePassword], async (req, res) => {
    const { username, password } = req.body;

    try {
        let user = await User.findOne({ username });

        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        user = new User({
            username,
            password,
        });

        await user.save();

        res.status(201).json({
            _id: user._id,
            username: user.username,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;

    try {
        let user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        res.json({
            _id: user._id,
            username: user.username,
            profilePicture: user.profilePicture,
            token: generateToken(user._id),
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
});

const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
