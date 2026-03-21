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
