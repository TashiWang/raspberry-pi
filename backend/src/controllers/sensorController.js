// src/controllers/sensorController.js
const { getSensorCollection, getDevicesCollection } = require('../config/mongo'); // Get both collections
const { ObjectId } = require('mongodb'); // For working with MongoDB ObjectIds

// Helper to generate random sensor data
function generateRandomSensorData() {
    const temp = parseFloat((Math.random() * (30.0 - 18.0) + 18.0).toFixed(2));
    const hum = parseFloat((Math.random() * (70.0 - 40.0) + 40.0).toFixed(2));
    const statuses = ["active", "warning", "error"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    return { temperature: temp, humidity: hum, status: status };
}

// GET /api/dashboard_data - Fetches latest sensor data and averages
exports.getDashboardData = async (req, res) => {
    try {
        const sensorCollection = getSensorCollection();

        // Fetch the 10 latest entries, sorted by timestamp descending
        const latestEntries = await sensorCollection
            .find({})
            .sort({ timestamp: -1 })
            .limit(10)
            .toArray();

        // Format timestamps and ObjectId for client-side display
        const formattedEntries = latestEntries.map(entry => ({
            ...entry,
            timestamp: entry.timestamp.toISOString().slice(0, 19).replace('T', ' '), // Format to YYYY-MM-DD HH:MM:SS
            _id: entry._id.toString() // Convert ObjectId to string
        }));

        // Calculate average temperature and humidity using aggregation pipeline
        const avgResults = await sensorCollection.aggregate([
            {
                $group: {
                    _id: null, // Group all documents
                    "avg_temp": { "$avg": "$temperature" },
                    "avg_humidity": { "$avg": "$humidity" }
                }
            }
        ]).toArray();

        const avgTemp = avgResults.length > 0 ? parseFloat(avgResults[0].avg_temp.toFixed(2)) : 0;
        const avgHumidity = avgResults.length > 0 ? parseFloat(avgResults[0].avg_humidity.toFixed(2)) : 0;

        res.json({
            latest_entries: formattedEntries,
            avg_temp: avgTemp,
            avg_humidity: avgHumidity
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ error: `Failed to load data: ${error.message}` });
    }
};

// POST /api/add_sensor_data - Adds general sensor data
exports.addSensorData = async (req, res) => {
    try {
        const sensorCollection = getSensorCollection();
        const data = req.body;

        if (!data) {
            return res.status(400).json({ error: "Invalid JSON data provided." });
        }

        let timestamp;
        try {
            timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
            if (isNaN(timestamp.getTime())) {
                throw new Error("Invalid timestamp format.");
            }
        } catch (e) {
            return res.status(400).json({ error: "Invalid timestamp format. Use ISO format (YYYY-MM-DDTHH:MM:SS.ffffff)." });
        }

        const status = data.status || "active";
        const temperature = parseFloat(data.temperature) || 0.0;
        const humidity = parseFloat(data.humidity) || 0.0;
        const ip_address = data.ip_address || (req.ip || null); // Auto-capture if not provided
        const mac_address = data.mac_address || null;

        const sensorDocument = {
            timestamp: timestamp,
            status: status,
            temperature: temperature,
            humidity: humidity,
            ip_address: ip_address,
            mac_address: mac_address,
            createdAt: new Date()
        };

        const result = await sensorCollection.insertOne(sensorDocument);
        res.status(201).json({ message: "Sensor data added successfully", id: String(result.insertedId) });
    } catch (error) {
        console.error("Error adding sensor data:", error);
        res.status(500).json({ error: `Failed to add sensor data: ${error.message}` });
    }
};

// POST /api/simulate_data - Simulates adding random sensor data
exports.simulateData = async (req, res) => {
    try {
        const sensorCollection = getSensorCollection();
        const { temperature, humidity, status } = generateRandomSensorData();

        const sensorDocument = {
            timestamp: new Date(),
            status: status,
            temperature: temperature,
            humidity: humidity,
            createdAt: new Date()
        };

        await sensorCollection.insertOne(sensorDocument);
        res.status(200).json({
            message: "Simulated data added successfully",
            data: { temperature: temperature, humidity: humidity, status: status }
        });
    } catch (error) {
        console.error("Error simulating data:", error);
        res.status(500).json({ error: `Failed to simulate data: ${error.message}` });
    }
};

// POST /api/:device_id/report - Endpoint for managed devices to send sensor data
exports.addDeviceSensorData = async (req, res) => {
    try {
        const sensorCollection = getSensorCollection();
        const devicesCollection = getDevicesCollection();
        const { device_id } = req.params;
        const data = req.body;

        if (!device_id) {
            return res.status(400).json({ error: "Device ID is required in the URL." });
        }
        if (!data || typeof data.temperature === 'undefined' || typeof data.humidity === 'undefined') {
            return res.status(400).json({ error: "Temperature and Humidity are required in the request body." });
        }

        // Verify if the device exists
        const device = await devicesCollection.findOne({ device_id: device_id });
        if (!device) {
            return res.status(404).json({ error: `Device with ID '${device_id}' not found.` });
        }

        let timestamp;
        try {
            timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
            if (isNaN(timestamp.getTime())) {
                throw new Error("Invalid timestamp format.");
            }
        } catch (e) {
            return res.status(400).json({ error: "Invalid timestamp format. Use ISO format (YYYY-MM-DDTHH:MM:SS.ffffff)." });
        }

        const sensorDocument = {
            device_id: device_id, // Link sensor data to the device
            timestamp: timestamp,
            status: data.status || "active",
            temperature: parseFloat(data.temperature),
            humidity: parseFloat(data.humidity),
            ip_address: req.ip || device.ip_address || null, // Prioritize current request IP, fallback to stored device IP
            mac_address: device.mac_address || null, // MAC is usually static, take from device doc
            createdAt: new Date()
        };

        // Insert sensor data
        const insertResult = await sensorCollection.insertOne(sensorDocument);

        // Update device's last_seen timestamp and status based on latest report
        await devicesCollection.updateOne(
            { device_id: device_id },
            { $set: { last_seen: new Date(), status: data.status || device.status } }
        );

        res.status(201).json({
            message: `Sensor data from device '${device_id}' added successfully`,
            sensor_data_id: String(insertResult.insertedId)
        });

    } catch (error) {
        console.error(`Error adding sensor data from device '${req.params.device_id}':`, error);
        res.status(500).json({ error: `Failed to add sensor data from device: ${error.message}` });
    }
};
