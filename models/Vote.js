// models/Vote.js

const mongoose = require('mongoose')

const voteSchema = new mongoose.Schema({
    voterEmail: {
        type: String,
        required: true,
        index: true
    },
    // This correctly stores an array of choices from a single submission,
    // e.g., all the "Finalist" votes are stored in one document.
    choices: [{
        categoryId: String,
        nomineeName: String
    }],
    castAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('Vote', voteSchema)