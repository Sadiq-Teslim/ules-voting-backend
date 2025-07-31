const mongoose = require('mongoose');

const VoterSchema = new mongoose.Schema({
    matricNumber: {
        type: String,
        required: true,
        unique: true, // This is the key to preventing double voting at the database level
        index: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    votedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Voter', VoterSchema);