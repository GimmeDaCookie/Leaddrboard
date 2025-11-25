const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    song: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song',
        required: true
    },
    arcade: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Arcade',
        required: false
    },
    rawScore: {
        type: Number,
        required: true
    },
    difficultyName: {
        type: String,
        required: true
    },
    difficultyScore: {
        type: Number
    },
    dateAchieved: {
        type: Date,
        required: true,
        default: Date.now
    }
});

scoreSchema.index({ song: 1, difficultyName: 1, rawScore: -1 });

const Score = mongoose.model('Score', scoreSchema);

module.exports = Score;