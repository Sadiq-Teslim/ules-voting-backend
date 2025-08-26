const express = require('express')
const router = express.Router()
const Voter = require('../models/Voter')
const Vote = require('../models/Vote')
const Nomination = require('../models/Nomination')
const Setting = require('../models/Setting')

// --- CORRECTED & FINAL Department Code to ID Mapping ---
const departmentMap = {
    '01': 'dept-chemical',
    '02': 'dept-civil',
    '03': 'dept-electrical-electronics',
    '04': 'dept-mechanical',
    '05': 'dept-surveying-geoinformatics',
    '06': 'dept-metallurgical-materials',
    '07': 'dept-systems',
    '08': 'dept-computer',
    '09': 'dept-petroleum-gas',
    '10': 'dept-biomedical',
}

// --- ROUTE 1: Validate Matriculation Number ---
// This is the gatekeeper. It validates the number's structure and returns the user's specific departmentId.
router.post('/validate', async(req, res) => {
    const { matricNumber } = req.body

    // Step 1: Basic format validation
    if (!matricNumber || !/^\d{9}$/.test(matricNumber)) {
        return res
            .status(400)
            .json({ valid: false, message: 'Invalid matriculation number format.' })
    }

    // Step 2: Extract parts for validation
    const year = parseInt(matricNumber.substring(0, 2), 10)
    const faculty = parseInt(matricNumber.substring(2, 4), 10)
    const departmentCodeStr = matricNumber.substring(4, 6) // Keep as a string '0X' for the map key
    const departmentCode = parseInt(departmentCodeStr, 10)
    const studentNumber = parseInt(matricNumber.substring(6, 9), 10);

    // Step 3: Check rules
    if (year < 18 || year > 24) {
        return res.status(400).json({
            valid: false,
            message: 'This platform is for students admitted between 2018 and 2024.'
        })
    }
    if (year === 20 || year === 22) {
        return res.status(400).json({
            valid: false,
            message: 'Invalid Matriculation Number.'
        })
    }
    if (faculty !== 4) {
        return res.status(400).json({
            valid: false,
            message: 'This matric number does not belong to the Faculty of Engineering.'
        })
    }
    if (departmentCode < 1 || departmentCode > 10) {
        return res.status(400).json({
            valid: false,
            message: 'Invalid department code for Engineering.'
        })
    }
    // --- NEW: Step 4: Check student number rules (Regular vs. Direct Entry) ---
    const isDirectEntry = studentNumber >= 500;
    const isRegularStudent = studentNumber >= 1 && studentNumber <= 180;

    if (!isDirectEntry && !isRegularStudent) {
        return res.status(400).json({
            valid: false,
            message: 'Invalid matriculation number.'
        });
    }
    // Step 4: Find the specific department ID using the map
    const departmentId = departmentMap[departmentCodeStr]
    if (!departmentId) {
        return res.status(500).json({
            valid: false,
            message: 'Could not resolve department. Please contact support.'
        })
    }

    // A user can always log in if their matric is valid. The UI will show their progress.
    res.status(200).json({
        valid: true,
        message: 'Validation successful. You can proceed to vote.',
        departmentId: departmentId // Send the crucial departmentId to the frontend
    })
})

// --- ROUTE 2: Get a voter's status ---
router.post('/voter-status', async(req, res) => {
    const { matricNumber } = req.body
    if (!matricNumber) {
        return res
            .status(400)
            .json({ message: 'Matriculation number is required.' })
    }
    try {
        const voter = await Voter.findOne({ matricNumber })
        res
            .status(200)
            .json({ votedSubCategoryIds: voter ? voter.votedSubCategoryIds : [] })
    } catch (error) {
        res
            .status(500)
            .json({ message: 'Server error while fetching voter status.' })
    }
})

// --- ROUTE 3: Submit votes ---
router.post('/submit', async(req, res) => {
    const { fullName, matricNumber, choices, mainCategory } = req.body
    if (!matricNumber ||
        !fullName ||
        !choices ||
        !Array.isArray(choices) ||
        !mainCategory
    ) {
        return res.status(400).json({ message: 'Invalid submission data.' })
    }

    try {
        let voter = await Voter.findOne({ matricNumber })
        if (!voter) {
            voter = new Voter({ matricNumber, fullName, votedSubCategoryIds: [] })
        }

        const incomingSubCategoryIds = choices.map(choice => choice.categoryId)
        const hasAlreadyVotedForOne = incomingSubCategoryIds.some(id =>
            voter.votedSubCategoryIds.includes(id)
        )

        if (hasAlreadyVotedForOne) {
            return res.status(403).json({
                message: 'Your submission includes a category you have already voted for.'
            })
        }

        if (choices.length > 0) {
            await new Vote({ voterMatric: matricNumber, choices }).save()
        }

        voter.votedSubCategoryIds.push(...incomingSubCategoryIds)
        await voter.save()

        res.status(201).json({
            success: true,
            message: `Your votes for the ${mainCategory} category have been recorded!`,
            votedSubCategoryIds: voter.votedSubCategoryIds
        })
    } catch (error) {
        console.error('Vote submission error:', error)
        res
            .status(500)
            .json({ message: 'A server error occurred while submitting your vote.' })
    }
})

// --- ADMIN AND NOMINATION ROUTES ---
router.post('/results', async(req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized: Invalid password.' })
    }
    try {
        const results = await Vote.aggregate([
            { $unwind: '$choices' },
            {
                $group: {
                    _id: {
                        categoryId: '$choices.categoryId',
                        nomineeName: '$choices.nomineeName'
                    },
                    votes: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.categoryId',
                    nominees: { $push: { name: '$_id.nomineeName', votes: '$votes' } }
                }
            },
            { $project: { _id: 0, category: '$_id', nominees: '$nominees' } }
        ])
        res.status(200).json(results)
    } catch (error) {
        res
            .status(500)
            .json({ message: 'A server error occurred while fetching results.' })
    }
})

router.post('/nominate', async(req, res) => {
    const { nominations } = req.body
    if (!nominations || !Array.isArray(nominations) || nominations.length === 0) {
        return res
            .status(400)
            .json({ message: 'Nomination data is missing or invalid.' })
    }
    try {
        await Nomination.insertMany(nominations)
        res.status(201).json({
            success: true,
            message: 'Your nomination(s) have been submitted for review!'
        })
    } catch (error) {
        res
            .status(500)
            .json({ message: 'A server error occurred while submitting.' })
    }
})

router.post('/pending-nominations', async(req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ message: 'Invalid admin password.' })
    }
    try {
        const pending = await Nomination.find({
            $or: [{ status: 'pending' }, { status: { $exists: false } }]
        }).sort({ submittedAt: -1 })
        res.status(200).json(pending)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending nominations.' })
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

router.post('/toggle-election', async(req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD)
        return res.status(403).json({ message: 'Invalid admin password.' })
    try {
        let setting = await Setting.findOneAndUpdate({ key: 'electionStatus' }, {}, { new: true, upsert: true })
        setting.value = setting.value === 'open' ? 'closed' : 'open'
        await setting.save()
        res.status(200).json({ success: true, newStatus: setting.value })
    } catch (error) {
        res.status(500).json({ message: 'Server error.' })
    }
})

router.post('/delete-nominations', async(req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD)
        return res.status(403).json({ message: 'Invalid admin password.' })
    try {
        const { deletedCount } = await Nomination.deleteMany({})
        res.status(200).json({
            success: true,
            message: `${deletedCount} nominations have been deleted.`
        })
    } catch (error) {
        res.status(500).json({ message: 'Server error.' })
    }
})

router.post('/reset-election', async(req, res) => {
    // 1. SECURITY: Check for the admin password
    const { password } = req.body
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ message: 'Invalid admin password.' })
    }

    try {
        // 2. Delete all documents from the 'votes' collection
        const voteDeletionResult = await Vote.deleteMany({})

        // 3. Delete all documents from the 'voters' collection
        const voterDeletionResult = await Voter.deleteMany({})

        const message = `Election has been reset. Deleted ${voteDeletionResult.deletedCount} vote records and ${voterDeletionResult.deletedCount} voter records.`
        console.log(message) // Log this important action on the server

        // 4. Send a success response to the frontend
        res.status(200).json({
            success: true,
            message: message
        })
    } catch (error) {
        console.error('Error resetting election:', error)
        res
            .status(500)
            .json({
                message: 'A server error occurred while resetting the election.'
            })
    }
})

module.exports = router