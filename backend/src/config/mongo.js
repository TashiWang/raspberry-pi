// src/config/mongo.js
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/";
const DB_NAME = "sensor_data_db";
const SENSOR_COLLECTION_NAME = "sensorReadings";
const DEVICES_COLLECTION_NAME = "devices";

let dbInstance;
let sensorCollectionInstance;
let devicesCollectionInstance;

async function connectToMongo() {
    if (dbInstance && sensorCollectionInstance && devicesCollectionInstance) {
        // If already connected, return existing instances
        return { db: dbInstance, sensorCollection: sensorCollectionInstance, devicesCollection: devicesCollectionInstance };
    }
    try {
        const client = await MongoClient.connect(MONGO_URI);
        dbInstance = client.db(DB_NAME);
        sensorCollectionInstance = dbInstance.collection(SENSOR_COLLECTION_NAME);
        devicesCollectionInstance = dbInstance.collection(DEVICES_COLLECTION_NAME);
        console.log("Connected to MongoDB successfully!");

        // Ensure indexes exist for both collections for efficient querying
        await sensorCollectionInstance.createIndex({ "timestamp": 1 });
        console.log(`Index on 'timestamp' for '${SENSOR_COLLECTION_NAME}' ensured.`);

        // Index for devices collection on device_id for quick lookups and uniqueness
        await devicesCollectionInstance.createIndex({ "device_id": 1 }, { unique: true });
        console.log(`Index on 'device_id' for '${DEVICES_COLLECTION_NAME}' ensured.`);

        return { db: dbInstance, sensorCollection: sensorCollectionInstance, devicesCollection: devicesCollectionInstance };
    } catch (err) {
        console.error("Failed to connect to MongoDB:", err);
        // In a real application, you might want to retry connection or log more details
        throw err; // Re-throw to be caught by server.js
    }
}

// Getter for the sensor data collection
function getSensorCollection() {
    if (!sensorCollectionInstance) {
        throw new Error("MongoDB sensor collection not initialized. Call connectToMongo() first.");
    }
    return sensorCollectionInstance;
}

// Getter for the devices collection
function getDevicesCollection() {
    if (!devicesCollectionInstance) {
        throw new Error("MongoDB devices collection not initialized. Call connectToMongo() first.");
    }
    return devicesCollectionInstance;
}

module.exports = {
    connectToMongo,
    getSensorCollection,
    getDevicesCollection,
    SENSOR_COLLECTION_NAME,
    DEVICES_COLLECTION_NAME
};
