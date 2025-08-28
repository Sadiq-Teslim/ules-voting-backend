// models/Voter.js
const mongoose = require('mongoose')

const voterSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    department: { type: String, required: true },
    votedSubCategoryIds: [{
        type: String // Will store 'ug-most-beautiful', 'gen-social-impact-award', etc.
    }]
}, { timestamps: true })

module.exports = mongoose.model('Voter', voterSchema)