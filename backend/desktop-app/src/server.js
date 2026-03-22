const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectMongo = require("./config/mongo");
const getDb = require("./config/sqlite");

const participantRoutes = require("./routes/participantRoutes");
const chatRoutes = require("./routes/chatRoutes");
const remarkRoutes = require("./routes/remarkRoutes");
const authRoutes = require("./routes/authRoutes");
const { syncAuthData } = require("./services/syncService");

const socketHandler = require("./sockets/socketHandler");

/**
 * DESKTOP APP BACKEND SERVER
 * Port: 3001
 * 
 * This server handles real-time interview operations, local data 
 * synchronization with the main dashboard, and WebRTC signaling.
 */
const app = express();
const PORT = 3001;

// Middlewares
app.use(express.json());
app.use(cors());

// Global Request Logger: Tracks incoming desktop client requests.
app.use((req, res, next) => {
    console.log(`[Desktop App Backend] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

/**
 * DUAL-DATABASE ARCHITECTURE:
 * 1. MongoDB: Used to sync with the main dashboard (Users, Company data).
 * 2. SQLite: Used for persistent local storage of chats and interview history 
 *    even when offline or during the meeting session.
 */
connectMongo().then(() => {
    // Background Service: Synchronizes credentials from the Dashboard DB to this instance.
    syncAuthData();
});
getDb(); // SQLite Initialization

// Routing Modules
app.use("/api/participants", participantRoutes); // Manage meeting attendees
app.use("/api/chat", chatRoutes);                 // Message history
app.use("/api/remarks", remarkRoutes);           // Interviewer notes
app.use("/api/auth", authRoutes);                 // Local auth / Token verification

/**
 * REAL-TIME COMMUNICATION:
 * Orchestrates Socket.IO for signaling and live interactions (Chat, Whiteboard).
 */
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

// Attach the socket event handler logic
socketHandler(io, getDb);

// Start
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Desktop App Backend running on http://0.0.0.0:${PORT}`);
});
