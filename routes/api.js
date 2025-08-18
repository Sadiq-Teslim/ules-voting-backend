// routes/api.js

const express = require('express');
const router = express.Router();
const Voter = require('../models/Voter');
const Vote = require('../models/Vote');
const Nomination = require('../models/Nomination');
const Setting = require('../models/Setting');

// --- ROUTE 1: Validate Matriculation Number (UPDATED LOGIC) ---
router.post('/validate', async(req, res) => {
    const { matricNumber } = req.body;

    // Step 1: Basic format validation (no change)
    if (!matricNumber || !/^\d{9}$/.test(matricNumber)) {
        return res.status(400).json({ valid: false, message: 'Invalid matriculation number format.' });
    }

    // Step 2: Validate faculty/department rules (no change)
    const year = parseInt(matricNumber.substring(0, 2), 10);
    const faculty = parseInt(matricNumber.substring(2, 4), 10);
    const department = parseInt(matricNumber.substring(4, 6), 10);

    if (year < 16 || year > 24) {
        return res.status(400).json({ valid: false, message: 'This platform is for students admitted between 2016 and 2024.' });
    }
    if (faculty !== 4) {
        return res.status(400).json({ valid: false, message: 'This does not belong to the Faculty of Engineering.' });
    }
    if (department < 1 || department > 10) {
        return res.status(400).json({ valid: false, message: 'Invalid department code for Engineering.' });
    }

    try {
        // Step 3: NEW LOGIC - Check if the user has already voted in ALL categories
        const existingVoter = await Voter.findOne({ matricNumber });

        // If a voter record exists AND they have voted in all 4 categories, block them.
        if (existingVoter && existingVoter.votedCategories && existingVoter.votedCategories.length >= 4) {
            return res.status(403).json({
                valid: false,
                message: 'Thank you! You have already voted in all available categories.'
            });
        }

        // If the matric number format is valid and they haven't completed all voting, allow them to proceed.
        res.status(200).json({
            valid: true,
            message: 'Validation successful. You can proceed to vote.'
        });

    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ valid: false, message: 'A server error occurred during validation.' });
    }
});

// --- ROUTE: Get a voter's status and previously voted categories ---
router.post('/voter-status', async(req, res) => {
    const { matricNumber } = req.body;
    if (!matricNumber) {
        return res.status(400).json({ message: 'Matriculation number is required.' });
    }
    try {
        const voter = await Voter.findOne({ matricNumber });
        res.status(200).json({ votedCategories: voter ? voter.votedCategories : [] });
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching voter status.' });
    }
});

// --- ROUTE: Submit votes for a single main category ---
router.post('/submit', async(req, res) => {
    const { fullName, matricNumber, choices, mainCategory } = req.body;
    if (!matricNumber || !fullName || !choices || !Array.isArray(choices) || !mainCategory) {
        return res.status(400).json({ message: 'Invalid submission data.' });
    }
    if (!['undergraduate', 'general', 'finalist', 'departmental'].includes(mainCategory)) {
        return res.status(400).json({ message: 'Invalid main category specified.' });
    }

    try {
        let voter = await Voter.findOne({ matricNumber });
        if (voter && voter.votedCategories.includes(mainCategory)) {
            return res.status(403).json({ message: `You have already submitted votes for the ${mainCategory} category.` });
        }
        if (!voter) {
            voter = new Voter({ matricNumber, fullName, votedCategories: [] });
        }
        if (choices.length > 0) {
            await new Vote({ voterMatric: matricNumber, choices }).save();
        }
        voter.votedCategories.push(mainCategory);
        await voter.save();
        res.status(201).json({ success: true, message: `Your votes for the ${mainCategory} category have been recorded!`, votedCategories: voter.votedCategories });
    } catch (error) {
        console.error('Vote submission error:', error);
        res.status(500).json({ message: 'A server error occurred while submitting your vote.' });
    }
});


// --- ADMIN AND OTHER ROUTES (No changes needed) ---

// Get Live Voting Results (Admin Only)
router.post('/results', async(req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized: Invalid password.' });
    }
    try {
        const results = await Vote.aggregate([
            { $unwind: '$choices' },
            { $group: { _id: { categoryId: '$choices.categoryId', nomineeName: '$choices.nomineeName' }, votes: { $sum: 1 } } },
            { $group: { _id: '$_id.categoryId', nominees: { $push: { name: '$_id.nomineeName', votes: '$votes' } } } },
            { $project: { _id: 0, category: '$_id', nominees: '$nominees' } }
        ]);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: 'A server error occurred while fetching results.' });
    }
});

// Submit a Nomination
router.post('/nominate', async(req, res) => {
    const { nominations } = req.body;
    if (!nominations || !Array.isArray(nominations) || nominations.length === 0) {
        return res.status(400).json({ message: 'Nomination data is missing or invalid.' });
    }
    try {
        await Nomination.insertMany(nominations);
        res.status(201).json({ success: true, message: 'Your nomination(s) have been submitted for review!' });
    } catch (error) {
        res.status(500).json({ message: 'A server error occurred while submitting.' });
    }
});

// Fetch Pending Nominations (Admin)
router.post('/pending-nominations', async(req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ message: 'Invalid admin password.' });
    }
    try {
        const pending = await Nomination.find({ $or: [{ status: 'pending' }, { status: { $exists: false } }] }).sort({ submittedAt: -1 });
        res.status(200).json(pending);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending nominations.' });
    }
});

// Get/Toggle Election Status and Delete Nominations (Admin routes)
router.get('/election-status', async(req, res) => {
    try {
        const setting = await Setting.findOne({ key: 'electionStatus' });
        res.status(200).json({ status: setting ? setting.value : 'closed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/toggle-election', async(req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ message: 'Invalid admin password.' });
    try {
        let setting = await Setting.findOneAndUpdate({ key: 'electionStatus' }, {}, { new: true, upsert: true });
        setting.value = setting.value === 'open' ? 'closed' : 'open';
        await setting.save();
        res.status(200).json({ success: true, newStatus: setting.value });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

router.post('/delete-nominations', async(req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ message: 'Invalid admin password.' });
    try {
        const { deletedCount } = await Nomination.deleteMany({});
        res.status(200).json({ success: true, message: `${deletedCount} nominations have been deleted.` });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;