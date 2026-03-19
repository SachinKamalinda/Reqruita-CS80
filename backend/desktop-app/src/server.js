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

const socketHandler = require("./sockets/socketHandler");

const app = express();
const PORT = 3001;

// Middlewares
app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
    console.log(`[Desktop App Backend] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Database Init
connectMongo();
getDb(); // Initializes SQLite

// Routes
app.use("/api/participants", participantRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/remarks", remarkRoutes);

// Server & Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

socketHandler(io, getDb);

// Start
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Desktop App Backend running on http://0.0.0.0:${PORT}`);
});
