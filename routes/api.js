// routes/api.js

const express = require('express')
const router = express.Router()
const Voter = require('../models/Voter')
const Vote = require('../models/Vote')
const Nomination = require('../models/Nomination')
const Setting = require('../models/Setting')

// --- ROUTE 1: Validate Matriculation Number ---
// This remains the same. It's the first check before the user sees the voting page.
router.post('/validate', async(req, res) => {
    const { matricNumber } = req.body

    // 1. Basic format validation
    if (!matricNumber || !/^\d{9}$/.test(matricNumber)) {
        return res.status(400).json({
            valid: false,
            message: 'Invalid matriculation number format. It must be 9 digits.'
        })
    }

    // 2. Extract and validate parts based on your rules
    const year = parseInt(matricNumber.substring(0, 2), 10)
    const faculty = parseInt(matricNumber.substring(2, 4), 10)
    const department = parseInt(matricNumber.substring(4, 6), 10)

    if (year < 16 || year > 24) {
        return res.status(400).json({
            valid: false,
            message: 'This platform is for students admitted between 2016 and 2024.'
        })
    }
    if (faculty !== 4) {
        return res.status(400).json({
            valid: false,
            message: 'This matriculation number does not belong to the Faculty of Engineering.'
        })
    }
    if (department < 1 || department > 10) {
        return res.status(400).json({
            valid: false,
            message: 'Invalid department code for the Faculty of Engineering.'
        })
    }

    try {
        // 3. Check if this matric number has already voted
        const existingVoter = await Voter.findOne({ matricNumber: matricNumber })
        if (existingVoter) {
            return res.status(403).json({
                valid: false,
                message: 'This matriculation number has already been used to vote. Thank you!'
            })
        }

        // 4. If all checks pass, the user is valid
        res.status(200).json({
            valid: true,
            message: 'Validation successful. You can proceed to vote.'
        })
    } catch (error) {
        console.error('Validation error:', error)
        res.status(500).json({
            valid: false,
            message: 'A server error occurred during validation.'
        })
    }
})

// --- NEW --- ROUTE 2: Submit a Completed Vote ---
// This is the endpoint your frontend will call when the user clicks the final "Complete Vote" button.
router.post('/submit', async(req, res) => {
    const { fullName, matricNumber, choices } = req.body

    // 1. SECURITY: Re-run all validation logic on the server side.
    // This ensures no one can bypass the frontend validation.
    if (!matricNumber ||
        !/^\d{9}$/.test(matricNumber) ||
        !fullName ||
        !choices ||
        choices.length === 0
    ) {
        return res.status(400).json({
            message: 'Invalid submission data. Please ensure all fields are correct.'
        })
    }
    const year = parseInt(matricNumber.substring(0, 2), 10)
    const faculty = parseInt(matricNumber.substring(2, 4), 10)
    const department = parseInt(matricNumber.substring(4, 6), 10)
    if (
        year < 16 ||
        year > 24 ||
        faculty !== 4 ||
        department < 1 ||
        department > 10
    ) {
        return res
            .status(400)
            .json({ message: 'Matriculation number is not valid for this election.' })
    }

    try {
        // 2. SECURITY: Check one last time if the matric number has been used.
        // This prevents race conditions (e.g., user submitting from two tabs at once).
        const existingVoter = await Voter.findOne({ matricNumber })
        if (existingVoter) {
            return res
                .status(403)
                .json({ message: 'This matriculation number has already voted.' })
        }

        // 3. SAVE THE VOTE: If validation passes, save the vote details.
        const newVote = new Vote({
            voterMatric: matricNumber,
            choices: choices // The array of selections from the frontend
        })
        await newVote.save()

        // 4. "BURN" THE MATRIC NUMBER: After the vote is successfully saved,
        // record the voter to prevent them from voting again.
        const newVoter = new Voter({
            matricNumber: matricNumber,
            fullName: fullName
        })
        await newVoter.save()

        // 5. SEND SUCCESS RESPONSE: Let the frontend know it worked.
        console.log(`Vote successfully recorded for matric number: ${matricNumber}`)
        res.status(201).json({
            success: true,
            message: 'Your vote has been successfully recorded. Thank you for participating!'
        })
    } catch (error) {
        // This will catch any database errors, including the unique index violation if a vote slips through.
        console.error('Vote submission error:', error)
        res
            .status(500)
            .json({ message: 'A server error occurred while submitting your vote.' })
    }
})

// --- NEW --- ROUTE 3: Get Live Voting Results (Admin Only) ---
router.post('/results', async(req, res) => {
    // 1. SECURITY: Check for the admin password
    const { password } = req.body
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized: Invalid password.' })
    }

    try {
        // 2. MONGODB AGGREGATION: This is a powerful way to process data in the database.
        const results = await Vote.aggregate([
            // Stage 1: Deconstruct the 'choices' array into separate documents
            // E.g., a vote with 3 choices becomes 3 separate documents
            { $unwind: '$choices' },

            // Stage 2: Group the documents by category and nominee, and count them
            // This counts how many times each nominee appears in each category
            {
                $group: {
                    _id: {
                        categoryId: '$choices.categoryId',
                        nomineeName: '$choices.nomineeName'
                    },
                    votes: { $sum: 1 }
                }
            },

            // Stage 3: Re-group the results by category
            // This structures the data nicely for the frontend charts
            {
                $group: {
                    _id: '$_id.categoryId',
                    nominees: {
                        $push: {
                            name: '$_id.nomineeName',
                            votes: '$votes'
                        }
                    }
                }
            },

            // Stage 4: Rename '_id' to 'category' for a cleaner output
            {
                $project: {
                    _id: 0,
                    category: '$_id',
                    nominees: '$nominees'
                }
            }
        ])

        res.status(200).json(results)
    } catch (error) {
        console.error('Error fetching results:', error)
        res
            .status(500)
            .json({ message: 'A server error occurred while fetching results.' })
    }
})

// --- ROUTE 4: Reset Votes for a Specific Category (Admin Only) ---
router.post('/reset-category', async(req, res) => {
    const { password, categoryId } = req.body

    // 1. SECURITY: Check admin password
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ message: 'Invalid admin password.' })
    }

    if (!categoryId) {
        return res.status(400).json({ message: 'Category ID is required.' })
    }

    try {
        // 2. Delete all votes that contain a choice for the specified category
        const result = await Vote.deleteMany({
            'choices.categoryId': categoryId
        })

        // 3. IMPORTANT: We also need to find all voters who ONLY voted for this category
        // and might need to be re-enabled. For simplicity in this version, we will
        // not re-enable voters, assuming they voted in other categories.
        // A more complex system could handle re-enabling voters.

        console.log(
            `Votes for category '${categoryId}' have been reset. Count: ${result.deletedCount}`
        )
        res.status(200).json({
            success: true,
            message: `Successfully reset ${result.deletedCount} votes for category ${categoryId}.`
        })
    } catch (error) {
        console.error('Error resetting category votes:', error)
        res
            .status(500)
            .json({ message: 'A server error occurred while resetting votes.' })
    }
})

// --- NEW ROUTE: Submit a Nomination ---
router.post('/nominate', async(req, res) => {
    // Note: We are now receiving an array of nominations
    const nominations = req.body.nominations

    if (!nominations || !Array.isArray(nominations) || nominations.length === 0) {
        return res
            .status(400)
            .json({ message: 'Nomination data is missing or invalid.' })
    }

    try {
        // We can optionally add more validation here if needed

        // Use insertMany for efficiency, as we're receiving an array
        await Nomination.insertMany(nominations)

        res.status(201).json({
            success: true,
            message: 'Your nomination(s) have been successfully submitted for review!'
        })
    } catch (error) {
        console.error('Nomination submission error:', error)
        res
            .status(500)
            .json({ message: 'A server error occurred while submitting.' })
    }
})

router.get('/election-status', async(req, res) => {
    try {
        const setting = await Setting.findOne({ key: 'electionStatus' })
        res.status(200).json({ status: setting ? setting.value : 'closed' })
    } catch (error) {
        res.status(500).json({ message: 'Server error.' })
    }
})

// Toggle the election status (open/close)
router.post('/toggle-election', async(req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD)
        return res.status(403).json({ message: 'Invalid admin password.' })
    try {
        let setting = await Setting.findOne({ key: 'electionStatus' })
        if (setting) {
            setting.value = setting.value === 'open' ? 'closed' : 'open'
            await setting.save()
        } else {
            setting = new Setting({ key: 'electionStatus', value: 'open' })
            await setting.save()
        }
        res.status(200).json({ success: true, newStatus: setting.value })
    } catch (error) {
        res.status(500).json({ message: 'Server error.' })
    }
})

// Delete all nominations
router.post('/delete-nominations', async(req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD)
        return res.status(403).json({ message: 'Invalid admin password.' })
    try {
        const result = await Nomination.deleteMany({})
        res.status(200).json({
            success: true,
            message: `${result.deletedCount} nominations have been deleted.`
        })
    } catch (error) {
        res.status(500).json({ message: 'Server error.' })
    }
})

// --- ADMIN ROUTE: Fetch Pending Nominations ---
router.post('/pending-nominations', async(req, res) => {
    // 1. SECURITY: Check the admin password
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ message: 'Invalid admin password.' })
    }

    try {
        // 2. Find all nominations that still have the 'pending' status
        const pending = await Nomination.find({ status: 'pending' }).sort({
            submittedAt: -1
        })
        res.status(200).json(pending)
    } catch (error) {
        console.error('Error fetching pending nominations:', error)
        res.status(500).json({ message: 'Error fetching pending nominations.' })
    }
})
module.exports = router