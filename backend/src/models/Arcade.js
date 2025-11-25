const mongoose = require('mongoose');

const arcadeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    location: {
        type: String
    },
    availableSeries: {
        type: [String]
    }
});

const Arcade = mongoose.model('Arcade', arcadeSchema);

module.exports = Arcade;