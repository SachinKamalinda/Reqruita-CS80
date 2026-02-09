// backend/config/db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "reqruita.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database (reqruita.db).");
        
        // Initialize tables
        db.serialize(() => {
            // Participants table (for desktop app)
            db.run(`
                CREATE TABLE IF NOT EXISTS participants (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    status TEXT NOT NULL
                )
            `);

            // Users table (for landing page sign-up/sign-in)
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Seed participants if empty
            db.get("SELECT COUNT(*) as count FROM participants", (err, row) => {
                if (!err && row && row.count === 0) {
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

                    const stmt = db.prepare("INSERT INTO participants (id, name, status) VALUES (?, ?, ?)");
                    seedData.forEach((p) => stmt.run(p.id, p.name, p.status));
                    stmt.finalize();
                }
            });
        });
    }
});

module.exports = db;
