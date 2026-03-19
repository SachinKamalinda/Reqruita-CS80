const getDb = require("../config/sqlite");

const getAllParticipants = (res, message) => {
    const db = getDb();
    db.all("SELECT * FROM participants", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (message) return res.json({ message, participants: rows });
        return res.json(rows);
    });
};

exports.getParticipants = (req, res) => {
    getAllParticipants(res);
};

exports.allowParticipant = (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Participant ID is required" });

    const db = getDb();
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

            db.run(
                "UPDATE participants SET status = 'interviewing' WHERE id = ? AND status = 'waiting'",
                [id],
                function (err) {
                    if (err) {
                        console.error(`[ALLOW] Update error for ${id}:`, err.message);
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: "Failed to update selected participant status" });
                    }

                    console.log(`[ALLOW] Update successful. Changes: ${this.changes}`);
                    if (this.changes === 0) {
                        db.run("ROLLBACK");
                        return res.status(404).json({ error: "Participant not found OR not in 'waiting' state" });
                    }

                    db.run("COMMIT", (err) => {
                        if (err) {
                            console.error(`[ALLOW] Commit error:`, err.message);
                            db.run("ROLLBACK");
                            return res.status(500).json({ error: "Failed to commit transaction" });
                        }
                        console.log(`[ALLOW] Participant ${id} is now interviewing.`);
                        getAllParticipants(res, "Success");
                    });
                }
            );
        });
    });
};

exports.joinParticipant = (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const id = "p_" + Math.random().toString(36).substr(2, 9);
    
    const db = getDb();
    db.run("INSERT INTO participants (id, name, status) VALUES (?, ?, ?)", [id, name, "waiting"], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all("SELECT * FROM participants", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Joined successfully", id: id, participants: rows });
        });
    });
};

exports.rejectParticipant = (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Participant ID is required" });

    const db = getDb();
    db.run("DELETE FROM participants WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Participant not found" });
        getAllParticipants(res, "Participant removed");
    });
};

exports.completeParticipant = (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Participant ID is required" });

    const db = getDb();
    db.run("UPDATE participants SET status = 'completed' WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Participant not found" });
        getAllParticipants(res, "Participant moved to completed");
    });
};

exports.leaveParticipant = (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const db = getDb();
    db.run(
        "UPDATE participants SET status = 'completed' WHERE name = ? AND status = 'interviewing'",
        [name],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            getAllParticipants(res, "Participant left session");
        }
    );
};
