// backend/server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const authRoutes = require("./routes/authRoutes");
const participantRoutes = require("./routes/participantRoutes");

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(cors());

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/participants", participantRoutes);

// Socket.io (Signaling)
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-meeting", ({ meetingId, role }) => {
        if (!meetingId) return;
        socket.join(meetingId);
        socket.to(meetingId).emit("peer-joined", { peerId: socket.id, role });
    });

    socket.on("webrtc-signal", ({ meetingId, to, data }) => {
        if (!meetingId || !data) return;
        if (to) {
            io.to(to).emit("webrtc-signal", { from: socket.id, data });
        } else {
            socket.to(meetingId).emit("webrtc-signal", { from: socket.id, data });
        }
    });

    socket.on("disconnecting", () => {
        for (const room of socket.rooms) {
            if (room !== socket.id) {
                socket.to(room).emit("peer-left", { peerId: socket.id });
            }
        }
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
    });
});

// Start Server
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on http://0.0.0.0:${PORT}`);
});
