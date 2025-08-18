// models/Voter.js

const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
    matricNumber: {
        type: String,
        required: true,
        unique: true, // Ensures a matric number can only be in this collection once
        index: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    // CRITICAL UPDATE: This array tracks which main categories have been voted on.
    // This allows a user to vote multiple times, once for each main category.
    votedCategories: [{
        type: String, // Will store 'undergraduate', 'general', 'finalist', 'departmental'
    }],
}, { timestamps: true }); // timestamps adds createdAt and updatedAt fields automatically

module.exports = mongoose.model('Voter', voterSchema);