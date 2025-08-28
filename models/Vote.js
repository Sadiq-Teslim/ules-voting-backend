// models/Vote.js

const mongoose = require('mongoose')

const voteSchema = new mongoose.Schema({
    // voterEmail removed, now IP-based only
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