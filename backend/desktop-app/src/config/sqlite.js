const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Put the DB file in the root backend directory as before
const DB_PATH = path.join(__dirname, "../../../../reqruita.db");

const initSqlite = () => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error("Error opening database:", err.message);
            return;
        }

        console.log("Connected to the SQLite database (reqruita.db).");

        db.serialize(() => {
            // 1) Create table with all columns including timerStartedAt
            db.run(
                `CREATE TABLE IF NOT EXISTS participants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            timerStartedAt TEXT
          )`, (err) => {
                    if (err) {
                        console.error("Create table error:", err.message);
                        return;
                    }
                    console.log("Participants table ready");
                }
            );

            // Create auth_credentials table
            db.run(
                `CREATE TABLE IF NOT EXISTS auth_credentials (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            meetingId TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            participantId TEXT NOT NULL,
            name TEXT NOT NULL
          )`, (err) => {
                    if (err) {
                        console.error("Create auth_credentials table error:", err.message);
                    } else {
                        console.log("Auth Credentials table ready");
                    }
                }
            );

            // 2) Check and add timerStartedAt column if it doesn't exist (for existing databases)
            db.all("PRAGMA table_info(participants)", [], (err, columns) => {
                if (err) {
                    console.error("PRAGMA error:", err.message);
                    return;
                }
                if (columns && Array.isArray(columns)) {
                    const hasTimerColumn = columns.some(col => col.name === 'timerStartedAt');
                    if (!hasTimerColumn) {
                        db.run("ALTER TABLE participants ADD COLUMN timerStartedAt TEXT", (err) => {
                            if (err) {
                                console.log("timerStartedAt column already exists or error:", err.message);
                            } else {
                                console.log("✓ Successfully added timerStartedAt column");
                            }
                        });
                    } else {
                        console.log("✓ timerStartedAt column already exists");
                    }
                }
            });

            // 3) Seed if empty (after table is created)
            db.get("SELECT COUNT(*) as count FROM participants", (err, row) => {
                if (err) {
                    console.error("Error checking table:", err.message);
                    return;
                }

                if (row && row.count === 0) {
                    console.log("Database is empty. Seeding with mock data...");
                    const seedData = [
                        { id: "p1", name: "Mas Rover", status: "interviewing" },
                        { id: "p2", name: "Robert Nachino", status: "waiting" },
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

    return db;
};

// Singleton export
let dbInstance;
module.exports = () => {
    if (!dbInstance) {
        dbInstance = initSqlite();
    }
    return dbInstance;
};
