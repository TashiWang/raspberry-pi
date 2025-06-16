// src/controllers/deviceController.js
const { getDevicesCollection } = require('../config/mongo');
const { ObjectId } = require('mongodb');
const http = require('http'); // ADDED: Node.js built-in HTTP module
const https = require('https'); // ADDED: Node.js built-in HTTPS module

// Configuration for slave device's API (adjust as needed for your slave app)
const SLAVE_API_PORT = 5001; // Assuming slave devices run their own API on this port
const SLAVE_API_PATH = '/execute_command'; // Path on the slave device's API for commands

// Helper to generate a dummy device ID
function generateDeviceId() {
    return 'device_' + Math.random().toString(36).substring(2, 9);
}

// Helper to generate random device data (for simulation/testing)
function generateRandomDeviceData() {
    const device_id = generateDeviceId();
    const name = `Simulated-SensorHub-${Math.floor(Math.random() * 1000)}`;
    const type = Math.random() < 0.7 ? 'sensor_hub' : (Math.random() < 0.5 ? 'actuator' : 'camera');
    // Set ip_address and mac_address to null for simulated devices, as they are not real
    const ip_address = null;
    const mac_address = null;
    const statuses = ["online", "offline", "error", "maintenance"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const location = ['Living Room', 'Bedroom', 'Kitchen', 'Garage', 'Outdoor'][Math.floor(Math.random() * 5)];
    const master_device_id = Math.random() < 0.8 ? `master_${Math.random().toString(36).substring(2, 6)}` : null;
    const public_key = master_device_id ? `SIMULATED_PUBKEY_${device_id}` : null; // Placeholder for simulated keys

    return {
        device_id,
        name,
        type,
        ip_address, // Now null for simulated devices
        mac_address, // Now null for simulated devices
        status,
        location,
        last_seen: new Date(),
        registeredAt: new Date(),
        master_device_id: master_device_id,
        public_key: public_key,
        is_simulated: true // Mark as simulated
    };
}

// GET /api/devices - List all devices
exports.listDevices = async (req, res) => {
    try {
        const devicesCollection = getDevicesCollection();
        const query = {};

        // Filter by 'is_simulated' query parameter if present
        if (req.query.is_simulated !== undefined) {
            query.is_simulated = req.query.is_simulated === 'true';
        }

        const devices = await devicesCollection.find(query).toArray();

        // Format timestamps and ObjectId for display
        const formattedDevices = devices.map(device => ({
            ...device,
            _id: device._id.toString(),
            last_seen: device.last_seen ? device.last_seen.toISOString() : null, // ISO string for frontend date pipe
            registeredAt: device.registeredAt ? device.registeredAt.toISOString() : null, // ISO string for frontend date pipe
        }));

        res.status(200).json(formattedDevices);
    } catch (error) {
        console.error("Error listing devices:", error);
        res.status(500).json({ error: `Failed to retrieve devices: ${error.message}` });
    }
};

// POST /api/devices - Add a new device
exports.addDevice = async (req, res) => {
    try {
        const devicesCollection = getDevicesCollection();
        const data = req.body;

        if (!data || !data.device_id || !data.name) {
            return res.status(400).json({ error: "Device ID and Name are required." });
        }

        // Ensure device_id is unique
        const existingDevice = await devicesCollection.findOne({ device_id: data.device_id });
        if (existingDevice) {
            return res.status(409).json({ error: `Device with ID '${data.device_id}' already exists.` });
        }

        const newDevice = {
            device_id: data.device_id,
            name: data.name,
            type: data.type || 'unknown',
            ip_address: data.ip_address || null,
            mac_address: data.mac_address || null,
            status: data.status || 'offline',
            location: data.location || null,
            last_seen: new Date(), // Set initial last_seen
            registeredAt: new Date(), // Set registration timestamp
            master_device_id: data.master_device_id || null,
            public_key: data.public_key || null, // Public key should be provided by the device itself
            is_simulated: false // Mark as not simulated (real device)
        };

        const result = await devicesCollection.insertOne(newDevice);
        res.status(201).json({ message: "Device added successfully", id: String(result.insertedId), device: newDevice });
    } catch (error) {
        console.error("Error adding device:", error);
        res.status(500).json({ error: `Failed to add device: ${error.message}` });
    }
};

// PUT /api/devices/:id - Update an existing device
exports.updateDevice = async (req, res) => {
    try {
        const devicesCollection = getDevicesCollection();
        const { id } = req.params; // Device ID (e.g., 'device_xyz') or MongoDB _id
        const updateData = req.body;

        if (!id) {
            return res.status(400).json({ error: "Device ID is required for update." });
        }

        // Prevent changing _id, registeredAt, or is_simulated via update
        delete updateData._id;
        delete updateData.registeredAt;
        delete updateData.is_simulated;

        let filter = { device_id: id }; // Prefer device_id for lookup
        // If 'id' looks like a MongoDB ObjectId, try to use it as _id as well
        if (ObjectId.isValid(id)) {
            filter = { $or: [{ device_id: id }, { _id: new ObjectId(id) }] };
        }

        // Update last_seen if status changes or other data implies activity
        if (updateData.status || updateData.ip_address || updateData.public_key) {
            updateData.last_seen = new Date();
        }

        const result = await devicesCollection.findOneAndUpdate(
            filter,
            { $set: updateData },
            { returnDocument: 'after' } // Return the updated document
        );

        if (!result.value) {
            return res.status(404).json({ error: `Device with ID '${id}' not found.` });
        }

        // Format timestamps for consistent response
        const formattedDevice = {
            ...result.value,
            _id: String(result.value._id),
            last_seen: result.value.last_seen ? result.value.last_seen.toISOString() : null,
            registeredAt: result.value.registeredAt ? result.value.registeredAt.toISOString() : null,
        };

        res.status(200).json({ message: "Device updated successfully", device: formattedDevice });
    } catch (error) {
        console.error("Error updating device:", error);
        res.status(500).json({ error: `Failed to update device: ${error.message}` });
    }
};

// DELETE /api/devices/:id - Delete a device
exports.deleteDevice = async (req, res) => {
    try {
        const devicesCollection = getDevicesCollection();
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "Device ID is required for deletion." });
        }

        let filter = { device_id: id };
        if (ObjectId.isValid(id)) {
            filter = { $or: [{ device_id: id }, { _id: new ObjectId(id) }] };
        }

        const result = await devicesCollection.deleteOne(filter);

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: `Device with ID '${id}' not found.` });
        }

        res.status(200).json({ message: `Device with ID '${id}' deleted successfully.` });
    } catch (error) {
        console.error("Error deleting device:", error);
        res.status(500).json({ error: `Failed to delete device: ${error.message}` });
    }
};

// POST /api/devices/simulate - Simulate adding a random device
exports.simulateDevice = async (req, res) => {
    try {
        const devicesCollection = getDevicesCollection();
        const newDeviceData = generateRandomDeviceData(); // This will now have ip_address and mac_address as null

        // Ensure device_id is unique even for simulated data (unlikely but good practice)
        const existingDevice = await devicesCollection.findOne({ device_id: newDeviceData.device_id });
        if (existingDevice) {
            newDeviceData.device_id = generateDeviceId(); // Regenerate if duplicate
            newDeviceData.name = `Simulated-SensorHub-${Math.floor(Math.random() * 1000)}`; // Update name too
        }

        const result = await devicesCollection.insertOne(newDeviceData);
        res.status(201).json({ message: "Simulated device added successfully", id: String(result.insertedId), device: newDeviceData });
    } catch (error) {
        console.error("Error simulating device:", error);
        res.status(500).json({ error: `Failed to simulate device: ${error.message}` });
    }
};

// POST /api/devices/:device_id/command - Send a command to a specific device
exports.sendPiCommand = async (req, res) => {
    try {
        const devicesCollection = getDevicesCollection();
        const { device_id } = req.params;
        const { command, value } = req.body; // Expect command and optional value in body

        if (!device_id || !command) {
            return res.status(400).json({ error: "Device ID and command are required." });
        }

        // Look up device details (IP, public_key) from the database
        const device = await devicesCollection.findOne({ device_id: device_id });

        if (!device) {
            return res.status(404).json({ error: `Device with ID '${device_id}' not found.` });
        }
        if (!device.ip_address) {
            // Updated error message to be more explicit about required IP for command
            return res.status(400).json({ error: `Device '${device_id}' does not have an IP address configured. Cannot send command.` });
        }

        // Construct the URL for the slave device's API
        const SLAVE_API_PORT = 5001; // Assuming slave devices run their own API on this port
        const SLAVE_API_PATH = '/execute_command'; // Path on the slave device's API for commands
        const slaveApiUrl = `http://${device.ip_address}:${SLAVE_API_PORT}${SLAVE_API_PATH}`;

        // Prepare payload for the slave device
        const payload = {
            command: command,
            value: value,
        };

        // Determine which module to use (http or https) based on the URL protocol
        const client = slaveApiUrl.startsWith('https://') ? https : http;
        const url = new URL(slaveApiUrl); // Use URL object for parsing

        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        // Send the command to the slave device using Node.js's built-in http/https module
        console.log(`Sending command to ${device.name} (${device.ip_address}):`, payload);

        let responseData = '';
        const request = client.request(url, requestOptions, (slaveResponse) => {
            slaveResponse.on('data', (chunk) => {
                responseData += chunk;
            });

            slaveResponse.on('end', () => {
                try {
                    const slaveJson = JSON.parse(responseData);
                    if (slaveResponse.statusCode >= 200 && slaveResponse.statusCode < 300) {
                        res.status(200).json({
                            message: `Command '${command}' sent successfully to ${device.name}.`,
                            slave_response: slaveJson
                        });
                    } else {
                        console.error(`Error from Slave Device (${device.ip_address}): ${slaveResponse.statusCode} - ${responseData}`);
                        res.status(slaveResponse.statusCode).json({
                            error: `Failed to send command to slave device. Device responded with status ${slaveResponse.statusCode}.`,
                            details: slaveJson
                        });
                    }
                } catch (parseError) {
                    console.error(`Error parsing slave response from ${device.ip_address}: ${parseError.message}, Raw: ${responseData}`);
                    res.status(slaveResponse.statusCode || 500).json({
                        error: `Failed to parse response from slave device.`,
                        raw_response: responseData
                    });
                }
            });
        });

        request.on('error', (error) => {
            console.error("Error sending command to slave device:", error);
            res.status(500).json({ error: `Failed to send command: ${error.message}` });
        });

        request.write(JSON.stringify(payload));
        request.end();

    } catch (error) {
        console.error("Error in sendPiCommand setup:", error);
        res.status(500).json({ error: `Failed to send command due to setup error: ${error.message}` });
    }
};
