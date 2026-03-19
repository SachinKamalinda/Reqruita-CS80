const ChatMessage = require("../models/ChatMessage");

module.exports = (io, getDb) => {
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
                const db = getDb();
                db.run(
                    "UPDATE participants SET status = 'waiting' WHERE id = ? AND status = 'interviewing'",
                    [participantId]
                );
                socketToParticipant.delete(socket.id);
            }
        });
        
        socket.on("join-chat", ({ interviewId }) =>{
            if(!interviewId) return;
            socket.join(`chat:${interviewId}`);
        });

        socket.on("chat-message", async (data) => {
            const { interviewId, senderRole, senderName, message, clientId } = data;
            if (!interviewId || !message) return;

            const broadcastMsg = {
                _id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                interviewId,
                senderRole,
                senderName: senderName || senderRole,
                message,
                clientId,
                createdAt: new Date().toISOString(),
            };

            io.to(`chat:${interviewId}`).emit("chat-message", broadcastMsg);

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
};
