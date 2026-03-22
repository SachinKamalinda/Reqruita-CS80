const http = require("http");
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

db.get("SELECT * FROM auth_credentials LIMIT 1", (err, row) => {
    if (err) {
        console.error("Error querying db:", err);
        process.exit(1);
    }

    if (!row) {
        console.error("Error: The auth_credentials table is EMPTY! Make sure you have valid sessions in MongoDB.");
        process.exit(1);
    }

    console.log("\nFound a valid credential in SQLite!");
    console.log("-----------------------------------------");
    console.log(`Role:       ${row.role}`);
    console.log(`Email:      ${row.email}`);
    console.log(`Meeting ID: ${row.meetingId}`);
    console.log(`Password:   ${row.password}`);
    console.log("-----------------------------------------\n");

    console.log("Sending POST request to http://localhost:3001/api/auth/login ...");

    const postData = JSON.stringify({
        email: row.email,
        meetingId: row.meetingId,
        password: row.password,
        role: row.role
    });

    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log(`Response Status Code: ${res.statusCode}`);
            console.log(`Response Body: ${data}`);
            
            if (res.statusCode === 200) {
                console.log("\n✅ HTTP Login API successfully authenticated using SQLite data!");
            } else {
                console.error("\n❌ API rejected the valid credentials. There is a logic flaw.");
            }
            process.exit(0);
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
        console.error("Make sure the backend is running on port 3001.");
    });

    req.write(postData);
    req.end();
});
