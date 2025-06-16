// src/routes/deviceRoutes.js
const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// GET /api/devices - List all devices (supports ?is_simulated=true/false)
router.get('/', deviceController.listDevices);
// POST /api/devices - Add a new device
router.post('/', deviceController.addDevice);
// PUT /api/devices/:id - Update an existing device by device_id or _id
router.put('/:id', deviceController.updateDevice);
// DELETE /api/devices/:id - Delete a device by device_id or _id
router.delete('/:id', deviceController.deleteDevice);
// POST /api/devices/simulate - Add a new simulated device
router.post('/simulate', deviceController.simulateDevice);

// POST /api/devices/:device_id/command - Send a command to a specific device
router.post('/:device_id/command', deviceController.sendPiCommand);

module.exports = router;
