const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "../reqruita.db");

console.log("Connecting to SQLite database at:", DB_PATH);
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        process.exit(1);
    }
});

const email = "amer.20231461@iit.ac.lk";
const meetingId = "MEET-JOB-4661B9-S01";
const password = "RQ1B9S01";
const role = "conduct";

console.log(`Querying DB for:\nEmail: '${email}'\nMeetingId: '${meetingId}'\nPassword: '${password}'\nRole: '${role}'`);

// Query 1: Exact Match
db.get(
    "SELECT * FROM auth_credentials WHERE email = ? AND meetingId = ? AND password = ? AND role = ?",
    [email, meetingId, password, role],
    (err, row) => {
        if (err) {
            console.error("Query Error:", err);
            return;
        }
        if (!row) {
            console.log("❌ Exact Match Query returned NO results!");
        } else {
            console.log("✅ Exact Match Query found result:", row);
        }
    }
);

// Query 2: Partial Match (Just meeting ID)
db.all(
    "SELECT * FROM auth_credentials WHERE meetingId = ?",
    [meetingId],
    (err, rows) => {
        console.log(`\nFound ${rows ? rows.length : 0} rows matching just the meetingId.`);
        if (rows && rows.length > 0) {
            console.log("Here is the first row:", rows[0]);
            
            // Do a strict comparison in JS to see exactly where it fails
            const r = rows[0];
            console.log("JS Comparison:");
            console.log(`email match? "${r.email}" === "${email}" : ${r.email === email}`);
            console.log(`meetingId match? "${r.meetingId}" === "${meetingId}" : ${r.meetingId === meetingId}`);
            console.log(`password match? "${r.password}" === "${password}" : ${r.password === password}`);
            console.log(`role match? "${r.role}" === "${role}" : ${r.role === role}`);
        }
    }
);
