const mongoose = require('mongoose')

const NominationSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    matricNumber: { type: String, required: true },
    category: { type: String, required: true }, // The category ID, e.g., 'influential-male'
    imageUrl: { type: String, required: true }, // URL from Cloudinary
    description: { type: String },
    submittedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Nomination', NominationSchema)