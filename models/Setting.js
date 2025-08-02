const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true, // e.g., 'electionStatus'
    },
    value: {
        type: String,
        required: true, // e.g., 'open' or 'closed'
    },
});

module.exports = mongoose.model('Setting', SettingSchema);