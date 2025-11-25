const mongoose = require('mongoose');

const difficultySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        enum: ['Beginner', 'Basic', 'Difficult', 'Expert', 'Challenge']
    },
    score: {
        type: Number,
        required: true,
        min: 1,
        max: 19
    }
});

const songSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    series: {
        type: String,
        required: true
    },
    bpm_range: {
        type: String,
        required: true
    },
    difficulties: [difficultySchema]
});

const Song = mongoose.model('Song', songSchema);
module.exports = Song;