// backend/server.js

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();

// --- PRODUCTION-READY CORS CONFIGURATION ---
// Define the list of origins that are allowed to connect to this backend.
const allowedOrigins = [
  'https://ules-vote.netlify.app', // Your live frontend URL
  'http://localhost:5173'         // Your local development frontend URL
];

const corsOptions = {
  origin: function (origin, callback) {
    // Check if the incoming request's origin is in our list of allowed origins.
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      // If it is, allow the request.
      callback(null, true);
    } else {
      // If it's not, block the request.
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions)); // Use the new, more flexible CORS options

// --- OTHER MIDDLEWARE ---
app.use(express.json());

// --- DATABASE CONNECTION ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};
connectDB();

// --- API ROUTES ---
app.use('/api', apiRoutes);

// --- START SERVER ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Voting server running on port ${PORT}`);
});