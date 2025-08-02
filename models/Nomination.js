// backend/models/Nomination.js
const mongoose = require('mongoose')

const NominationSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    popularName: { type: String }, // Optional
    category: { type: String, required: true }, // The category ID, e.g., 'influential-male'
    imageUrl: { type: String }, // Optional
    // We can add a field to track who nominated them if needed later
    // nominatorMatric: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Nomination', NominationSchema)