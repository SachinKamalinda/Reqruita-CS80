/**
 * DNS OVERRIDE: 
 * Ensures the server uses Google's DNS for reliability when making 
 * external requests (like sending emails via Resend).
 */
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const connectMongo = require("./config/mongo");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const sessionsRoutes = require("./routes/sessionsRoutes");
const jobFormRoutes = require("./routes/jobFormRoutes");

const app = express();
const PORT = 3003;

// Middlewares
app.use(express.json());
app.use(cors());

console.log("Starting Auth/Dashboard Server...");

// Global Request Logger: Prints method/URL for easier debugging in development
app.use((req, res, next) => {
  console.log(
    `[Dashboard Backend] ${new Date().toISOString()} - ${req.method} ${req.url}`,
  );
  next();
});

// Database Init
connectMongo();

// API Route Modules
app.use("/api", authRoutes);      // Public/Auth routes: register, login, verification, password reset
app.use("/api", dashboardRoutes); // User-specific routes: settings, member management
app.use("/api", sessionsRoutes);  // Workflow: Interview scheduling and orchestration
app.use("/api", jobFormRoutes);   // Management: Form creation and public submission handlers

// Start
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Auth/Dashboard Server is running on http://0.0.0.0:${PORT}`);
});
