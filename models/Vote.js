// models/Vote.js

const mongoose = require('mongoose')

const voteSchema = new mongoose.Schema({
    voterEmail: {
        type: String,
        required: true,
        index: true
    },
    ipAddress: {
        type: String,
        required: true,
        index: true
    },
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