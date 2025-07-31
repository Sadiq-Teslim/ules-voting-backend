if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api'); // Import the new routes file

const app = express();

// --- Middleware ---
app.use(cors()); // Allows your React frontend to communicate with this server
app.use(express.json()); // Allows the server to understand JSON request bodies

// --- Database Connection ---
const connectDB = async() => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Exit process with failure if the database connection fails
        process.exit(1);
    }
};
connectDB();

// --- API Routes ---
// All routes defined in routes/api.js will be available under the /api path
// e.g., /api/validate
app.use('/api', apiRoutes);

// --- Start Server ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Voting server running on port ${PORT}`);
    if (!process.env.MONGODB_URI) {
        console.warn('WARNING: MONGODB_URI is not set. Database will not connect.');
    }
});