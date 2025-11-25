const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/users/:username
// @desc    Get public user profile
// @access  Public
router.get('/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username }).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
});

const { validateUsername, validatePassword, validateProfilePicture } = require('../middleware/validation');
const { profileLimiter } = require('../middleware/rateLimiter');

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [protect, profileLimiter, validateUsername, validatePassword, validateProfilePicture], async (req, res) => {
    try {
        const { username, password, profilePicture } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if username is being changed and if it's already taken
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ message: 'Username already taken' });
            }
            user.username = username;
        }

        // Update password if provided
        if (password) {
            user.password = password; // Will be hashed by pre-save middleware
        }

        // Update profile picture if provided
        if (profilePicture !== undefined) {
            user.profilePicture = profilePicture;
        }

        await user.save();

        // Return updated user without password
        const updatedUser = await User.findById(user._id).select('-password');
        res.json(updatedUser);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
