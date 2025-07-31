// backend/server.js

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();

// --- CORS CONFIGURATION FOR PRODUCTION ---
// Define the list of allowed origins (your frontend URLs)
const allowedOrigins = [
  'https://ules-vote.netlify.app', // Your live frontend
  'http://localhost:5173'         // Your local development frontend
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
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