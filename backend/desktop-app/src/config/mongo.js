const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

const connectMongo = async () => {
    try {
        const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reqruita";
        await mongoose.connect(uri);
        console.log("Connected to MongoDB for Chat & Remarks");
    } catch (err) {
        console.error("MongoDB connection error:", err.message);
    }
};

module.exports = connectMongo;
