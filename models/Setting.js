const mongoose = require('mongoose')

const SettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true }
})

module.exports = mongoose.model('Setting', SettingSchema)
    // This model will store the current status of the election. 
    // It will have a key 'electionStatus' and possible values: 'open', 'closed'.
    // When the election is open, voters can cast their votes.
    // When it's closed, voting is no longer allowed.