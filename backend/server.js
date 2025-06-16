// server.js
require('dotenv').config(); // Load environment variables from .env file

const app = require('./src/app'); // Import the configured Express app
const { connectToMongo } = require('./src/config/mongo'); // Import connectToMongo

const port = process.env.PORT || 5000;

async function startServer() {
    try {
        await connectToMongo(); // Establish MongoDB connection
        app.listen(port, () => {
            console.log(`Express sensor API listening at http://localhost:${port}`);
            console.log("Ensure MongoDB is running and accessible via MONGO_URI environment variable or default.");
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();
