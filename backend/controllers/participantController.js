// backend/controllers/participantController.js
const db = require("../config/db");

// Helper: get all participants
function getAllParticipants(res, message) {
    db.all("SELECT * FROM participants", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (message) return res.json({ message, participants: rows });
        return res.json(rows);
    });
}

exports.getParticipants = (req, res) => {
    getAllParticipants(res);
};

exports.allowParticipant = (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Participant ID is required" });

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        db.run(
            "UPDATE participants SET status = 'completed' WHERE status = 'interviewing'",
            (err) => {
                if (err) {
                    db.run("ROLLBACK");
                    return res
                        .status(500)
                        .json({ error: "Failed to update current interviewing status" });
                }

                db.run(
                    "UPDATE participants SET status = 'interviewing' WHERE id = ? AND status = 'waiting'",
                    [id],
                    function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            return res
                                .status(500)
                                .json({ error: "Failed to update selected participant status" });
                        }

                        if (this.changes === 0) {
                            db.run("ROLLBACK");
                            return res.status(404).json({
                                error: "Participant not found OR not in 'waiting' state",
                            });
                        }

                        db.run("COMMIT", (err) => {
                            if (err) {
                                db.run("ROLLBACK");
                                return res
                                    .status(500)
                                    .json({ error: "Failed to commit transaction" });
                            }
                            getAllParticipants(res, "Success");
                        });
                    }
                );
            }
        );
    });
};

exports.rejectParticipant = (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Participant ID is required" });

    db.run("DELETE FROM participants WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0)
            return res.status(404).json({ error: "Participant not found" });

        getAllParticipants(res, "Participant removed");
    });
};

exports.completeParticipant = (req, res) => {
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
};

exports.joinParticipant = (req, res) => {
    const nameRaw = req.body?.name;

    if (!nameRaw) return res.status(400).json({ error: "Name is required" });

    const name = String(nameRaw).trim();
    if (!name) return res.status(400).json({ error: "Name is required" });
    if (name.length > 50)
        return res.status(400).json({ error: "Name is too long (max 50)" });

    const id =
        "u_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 7);

    db.run(
        "INSERT INTO participants (id, name, status) VALUES (?, ?, 'waiting')",
        [id, name],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            getAllParticipants(res, "Joined");
        }
    );
};
