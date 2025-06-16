// src/routes/sensorRoutes.js
const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

// GET /api/dashboard_data - Fetch latest sensor entries and averages
router.get('/dashboard_data', sensorController.getDashboardData);

// POST /api/add_sensor_data - Add new sensor data (general purpose, not device-specific)
router.post('/add_sensor_data', sensorController.addSensorData);

// POST /api/simulate_data - Simulate adding random sensor data (general purpose)
router.post('/simulate_data', sensorController.simulateData);

// POST /api/:device_id/report - Route for managed devices to send sensor data
router.post('/sensor_data/:device_id/report', sensorController.addDeviceSensorData);

module.exports = router;
