// backend/server.js
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();

const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const connectMongo = require("./chatBackend");
const InterviewRemark = require("./InterviewRemark");

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, "reqruita.db");

// ✅ Use built-in JSON parser (no need body-parser)
app.use(express.json());

// ✅ CORS (lock down origin later)
app.use(cors());

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Connect to MongoDB for chat data
connectMongo();

// -------------------- DB SETUP --------------------
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        return;
    }

    console.log("Connected to the SQLite database (reqruita.db).");

    db.serialize(() => {
        // 1) Create table
        db.run(
            `CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL
      )`
        );

        // 2) Seed if empty
        db.get("SELECT COUNT(*) as count FROM participants", (err, row) => {
            if (err) {
                console.error("Error checking table:", err.message);
                return;
            }

            if (row.count === 0) {
                console.log("Database is empty. Seeding with mock data...");
                const seedData = [
                    // NOTE: You had 2 interviewing people. Usually only 1 should be interviewing.
                    { id: "p1", name: "Mas Rover", status: "interviewing" },
                    { id: "p2", name: "Robert Nachino", status: "waiting" }, // changed to waiting to avoid 2 interviewing
                    { id: "w1", name: "Elaina Kurama", status: "waiting" },
                    { id: "w2", name: "Navia Fon", status: "waiting" },
                    { id: "w3", name: "Jack Bron", status: "waiting" },
                    { id: "w4", name: "Raiden", status: "waiting" },
                    { id: "c1", name: "Aether", status: "completed" },
                    { id: "c2", name: "Ananta", status: "completed" },
                    { id: "c3", name: "Brian Sumo", status: "completed" },
                    { id: "c4", name: "Mavuika", status: "completed" },
                ];

                const stmt = db.prepare(
                    "INSERT INTO participants (id, name, status) VALUES (?, ?, ?)"
                );

                seedData.forEach((p) => {
                    stmt.run(p.id, p.name, p.status, (e) => {
                        if (e) console.error("Seed insert failed:", e.message);
                    });
                });

                stmt.finalize(() => {
                    console.log(`Successfully seeded ${seedData.length} participants.`);
                });
            } else {
                console.log(`Database already has ${row.count} participants.`);
            }
        });
    });
});

// Helper: get all participants
function getAllParticipants(res, message) {
    db.all("SELECT * FROM participants", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (message) return res.json({ message, participants: rows });
        return res.json(rows);
    });
}

// -------------------- REST API --------------------

// GET /api/participants
app.get("/api/participants", (req, res) => {
    getAllParticipants(res);
});

// POST /api/participants/allow
// Logic: Ensure only ONE person is interviewing at a time.
app.post("/api/participants/allow", (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Participant ID is required" });

    // 1) Check if someone is already interviewing
    console.log(`[ALLOW] Checking if someone is already interviewing for session...`);
    db.get("SELECT id, name FROM participants WHERE status = 'interviewing'", (err, row) => {
        if (err) return res.status(500).json({ error: "Database error checking session" });
        if (row) {
            console.log(`[ALLOW] Conflict: ${row.name} (${row.id}) is already interviewing.`);
            return res.status(400).json({ error: "Someone is already in the session" });
        }

        console.log(`[ALLOW] Proceeding to admit participant ID: ${id}`);
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // ✅ only allow if they are waiting
            db.run(
                "UPDATE participants SET status = 'interviewing' WHERE id = ? AND status = 'waiting'",
                [id],
                function (err) {
                    if (err) {
                        console.error(`[ALLOW] Update error for ${id}:`, err.message);
                        db.run("ROLLBACK");
                        return res
                            .status(500)
                            .json({ error: "Failed to update selected participant status" });
                    }

                    console.log(`[ALLOW] Update successful. Changes: ${this.changes}`);
                    if (this.changes === 0) {
                        db.run("ROLLBACK");
                        return res.status(404).json({
                            error: "Participant not found OR not in 'waiting' state",
                        });
                    }

                    db.run("COMMIT", (err) => {
                        if (err) {
                            console.error(`[ALLOW] Commit error:`, err.message);
                            db.run("ROLLBACK");
                            return res
                                .status(500)
                                .json({ error: "Failed to commit transaction" });
                        }
                        console.log(`[ALLOW] Participant ${id} is now interviewing.`);
                        getAllParticipants(res, "Success");
                    });
                }
            );
        });
    });
});

// POST /api/participants/join
// Simply adds a new participant with 'waiting' status
app.post("/api/participants/join", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const id = "p_" + Math.random().toString(36).substr(2, 9);
    
    db.run("INSERT INTO participants (id, name, status) VALUES (?, ?, ?)", [id, name, "waiting"], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all("SELECT * FROM participants", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                message: "Joined successfully",
                id: id,
                participants: rows
            });
        });
    });
});

// POST /api/participants/reject
// mark status='rejected' or just delete.
app.post("/api/participants/reject", (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Participant ID is required" });

    db.run("DELETE FROM participants WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0)
            return res.status(404).json({ error: "Participant not found" });

        getAllParticipants(res, "Participant removed");
    });
});

// POST /api/participants/complete
app.post("/api/participants/complete", (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Participant ID is required" });

    db.run(
        "UPDATE participants SET status = 'completed' WHERE id = ?",
        [id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0)
                return res.status(404).json({ error: "Participant not found" });

            getAllParticipants(res, "Participant moved to completed");
        }
    );
});

// POST /api/participants/leave
app.post("/api/participants/leave", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    // Use name + interviewing status to find the one to move out of the session
    // This frees up the 'interviewing' slot for others
    db.run(
        "UPDATE participants SET status = 'completed' WHERE name = ? AND status = 'interviewing'",
        [name],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            getAllParticipants(res, "Participant left session");
        }
    );
});

/* GET /api/chat/{interviewId} */
const ChatMessage = require("./ChatMessage");
app.get("/api/chat/:interviewId", async (req, res) => {
    try {
        const messages = await ChatMessage.find({
            interviewId: req.params.interviewId,
        }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: "Failed to load chat" });
    }
});

/* DELETE /api/chat/{interviewId} */
app.delete("/api/chat/:interviewId", async (req, res) => {
    try {
        await ChatMessage.deleteMany({ interviewId: req.params.interviewId });
        res.json({ message: "Chat history cleared" });
    } catch (err) {
        res.status(500).json({ error: "Failed to clear chat" });
    }
});

// -------------------- REMARKS API --------------------

// POST /api/remarks
app.post("/api/remarks", async (req, res) => {
    const { interviewId, participantId, remark } = req.body;
    if (!interviewId || !participantId || remark === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // Find existing or create new
        let entry = await InterviewRemark.findOne({ interviewId, participantId });
        if (entry) {
            entry.remark = remark;
            await entry.save();
        } else {
            entry = await InterviewRemark.create({ interviewId, participantId, remark });
        }
        res.json({ message: "Remark saved successfully", remark: entry });
    } catch (err) {
        console.error("Failed to save remark:", err.message);
        res.status(500).json({ error: "Failed to save remark" });
    }
});

// GET /api/remarks/:participantId
app.get("/api/remarks/:participantId", async (req, res) => {
    try {
        const entry = await InterviewRemark.findOne({ 
            participantId: req.params.participantId 
        }).sort({ updatedAt: -1 });
        res.json(entry || { remark: "" });
    } catch (err) {
        res.status(500).json({ error: "Failed to load remark" });
    }
});


// -------------------- SOCKET.IO (SIGNALING) --------------------
// WebRTC needs signaling: offer/answer/ice messages.
// This does NOT send video — it only helps peers connect.

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

const socketToParticipant = new Map();

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-meeting", ({ meetingId, role, participantId }) => {
        if (!meetingId) return;
        socket.join(meetingId);
        
        if (participantId) {
            socketToParticipant.set(socket.id, participantId);
        }

        socket.to(meetingId).emit("peer-joined", { peerId: socket.id, role });
    });

    // webrtc-signal can be sent to a specific peer (to) or to everyone in room
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
        const participantId = socketToParticipant.get(socket.id);
        if (participantId) {
            console.log(`[CLEANUP] Participant ${participantId} disconnected. Clearing interviewing status.`);
            // If they were 'interviewing', set them back to 'waiting' or 'completed' so slot is freed
            db.run(
                "UPDATE participants SET status = 'waiting' WHERE id = ? AND status = 'interviewing'",
                [participantId]
            );
            socketToParticipant.delete(socket.id);
        }
    });
    
    /*-------------------- SOCKET.IO (CHAT) --------------------*/
    
    socket.on("join-chat",({interviewId}) =>{
        if(!interviewId) return;
        socket.join(`chat:${interviewId}`);
    });

    socket.on("chat-message", async (data) => {
        const { interviewId, senderRole, senderName, message, clientId } = data;
        if (!interviewId || !message) return;

        // Build the message payload immediately so we can broadcast
        const broadcastMsg = {
            _id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            interviewId,
            senderRole,
            senderName: senderName || senderRole,
            message,
            clientId, // Echo back for client-side deduplication
            createdAt: new Date().toISOString(),
        };

        // Always broadcast to the room RIGHT AWAY (don't wait for DB)
        io.to(`chat:${interviewId}`).emit("chat-message", broadcastMsg);

        // Persist to MongoDB in the background — failure is non-fatal
        try {
            await ChatMessage.create({
                interviewId,
                senderRole,
                senderName: senderName || senderRole,
                message,
            });
        } catch (err) {
            console.error("Failed to save chat message to DB (message was still delivered):", err.message);
        }
    });
});

// -------------------- START SERVER --------------------
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on http://0.0.0.0:${PORT}`);
});
