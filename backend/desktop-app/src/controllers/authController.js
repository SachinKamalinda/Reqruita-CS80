const getDb = require("../config/sqlite");

exports.login = async (req, res) => {
    try {
        const { email, meetingId, password, role } = req.body;

        if (!email || !meetingId || !password || !role) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const db = await getDb(); // getDb() might return synchronously in config/sqlite.js, but it's safe to await if we must or just handle it.
        
        // Ensure we handle db safely. The getDb() initialized inside server.js is synchronous though it starts async connection
        db.get(
            "SELECT * FROM auth_credentials WHERE email = ? AND meetingId = ? AND password = ? AND role = ?",
            [normalizedEmail, meetingId, password, role],
            (err, row) => {
                if (err) {
                    console.error("Local DB query error:", err);
                    return res.status(500).json({ success: false, message: "Database error." });
                }

                if (!row) {
                    return res.status(401).json({ success: false, message: "Invalid credentials. Please check Email, Meeting ID, and Password." });
                }

                if (row.role === "conduct") {
                    // Populate the local participants waiting room with candidates assigned to this identical session
                    db.serialize(() => {
                        db.run("DELETE FROM participants", (err) => {
                            if (err) console.error("Failed to clear participants table:", err);
                        });
                        
                        db.run(
                            `INSERT INTO participants (id, name, status, timerStartedAt) 
                             SELECT participantId, name, 'waiting', NULL 
                             FROM auth_credentials 
                             WHERE meetingId = ? AND role = 'join'`,
                            [meetingId],
                            (err) => {
                                if (err) {
                                    console.error("Failed to dynamically populate waiting room candidates:", err);
                                } else {
                                    console.log(`Successfully populated waiting room for session ${meetingId}.`);
                                }
                            }
                        );
                    });
                }

                return res.json({
                    success: true,
                    message: "Login successful.",
                    data: {
                        participantId: row.participantId,
                        name: row.name,
                        role: row.role
                    }
                });
            }
        );
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};
