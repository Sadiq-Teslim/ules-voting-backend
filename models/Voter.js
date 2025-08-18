// models/Voter.js
const mongoose = require('mongoose')

const voterSchema = new mongoose.Schema({
    matricNumber: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    // CRITICAL CHANGE: We now store an array of individual award IDs that have been voted for.
    votedSubCategoryIds: [{
        type: String // Will store 'ug-most-beautiful', 'gen-social-impact-award', etc.
    }]
}, { timestamps: true })

module.exports = mongoose.model('Voter', voterSchema)