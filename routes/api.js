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

// --- ROUTE 1: Validate Department Only ---
router.post('/validate', async(req, res) => {
    const { department } = req.body;
    if (!department) {
        return res.status(400).json({ valid: false, message: 'Department is required.' });
    }
    res.status(200).json({
        valid: true,
        message: 'Validation successful. You can proceed to vote.',
        departmentId: department
    });
});

// --- ROUTE 2: Get a voter's status ---
router.post('/voter-status', async(req, res) => {
    // IP-based only, no email
    res.status(200).json({ votedSubCategoryIds: [] });
});

// --- ROUTE 3: Submit votes ---
router.post('/submit', async(req, res) => {
    const { fullName, department, choices, mainCategory } = req.body;
    if (!fullName || !department || !choices || !Array.isArray(choices) || !mainCategory) {
        return res.status(400).json({ message: 'Invalid submission data.' });
    }
    try {
        // Get IP address from request
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress || req.ip;

        const incomingSubCategoryIds = choices.map(choice => choice.categoryId);
        // Check if this IP has already voted for any of these awards
        const ipVotedForOne = await Vote.findOne({
            ipAddress,
            'choices.categoryId': { $in: incomingSubCategoryIds }
        });
        if (ipVotedForOne) {
            return res.status(403).json({
                message: 'Your submission includes a category you have already voted for (by IP).'
            });
        }
        if (choices.length > 0) {
            await new Vote({ ipAddress, choices }).save();
        }
        res.status(201).json({
            success: true,
            message: `Your votes for the ${mainCategory} category have been recorded!`,
            votedSubCategoryIds: []
        });
    } catch (error) {
        console.error('Vote submission error:', error);
        res.status(500).json({ message: 'A server error occurred while submitting your vote.' });
    }
});

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