const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require("express");
const cors = require("cors");
const connectMongo = require("./config/mongo");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();
const PORT = 3003;

// Middlewares
app.use(express.json());
app.use(cors());

console.log("Starting Auth/Dashboard Server...");

app.use((req, res, next) => {
    console.log(`[Dashboard Backend] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Database Init
connectMongo();

// Routes
app.use("/api", authRoutes); // /api/register, /api/login, etc.
app.use("/api", dashboardRoutes); // /api/me, /api/dashboard/users...

// Start
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Auth/Dashboard Server is running on http://0.0.0.0:${PORT}`);
});
