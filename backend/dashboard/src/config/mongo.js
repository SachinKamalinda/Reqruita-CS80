const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

/**
 * MONGODB CONNECTION COMPONENT
 * Establishes a connection to the 'Reqruita' database on the Dashboard Server.
 */
const connectMongo = async () => {
    try {
        // Preference: Environment variable (production-grade) or localhost (development)
        const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reqruita";
        
        await mongoose.connect(uri);
        console.log("Connected to MongoDB for Dashboard/Users");
    } catch (err) {
        console.error("MongoDB connection error:", err.message);
        // Process doesn't exit automatically; ensure logs are monitiored.
    }
};

module.exports = connectMongo;
