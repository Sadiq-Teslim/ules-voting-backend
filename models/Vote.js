const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    voterMatric: {
        type: String,
        required: true,
        index: true,
    },
    // This will store an array of choices, e.g., [{ categoryId: 'influential-male', nomineeName: 'John Doe' }]
    choices: [{
        categoryId: String,
        nomineeName: String,
    }],
    castAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Vote', VoteSchema);