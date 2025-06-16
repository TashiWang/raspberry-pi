// sensor-api-project/src/app.js
const express = require('express');
const cors = require('cors'); // For Cross-Origin Resource Sharing
const sensorRoutes = require('./routes/sensorRoutes'); // Import sensor routes
const deviceRoutes = require('./routes/deviceRoutes'); // Import device routes

const app = express();

// --- Middleware ---
// Enable CORS for all routes - essential for frontend to communicate
app.use(cors());
// Parse JSON bodies for incoming requests
app.use(express.json());

// --- API Routes ---
// Mount sensor-related routes under /api
app.use('/api', sensorRoutes);
// Mount device-related routes under /api/devices
app.use('/api/devices', deviceRoutes);

// Basic health check route
app.get('/', (req, res) => {
    res.send('Sensor API is running!');
});

module.exports = app;
