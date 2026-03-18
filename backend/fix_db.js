const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'reqruita.db');
const db = new sqlite3.Database(dbPath);

console.log('Sanitizing database statuses...');

db.serialize(() => {
    // 1. Remove hidden characters from all statuses
    db.run("UPDATE participants SET status = replace(replace(status, char(10), ''), char(13), '')", (err) => {
        if (err) console.error('Error sanitizing newlines:', err);
        else console.log('✅ Newlines removed from statuses.');
    });

    db.run("UPDATE participants SET status = trim(status)", (err) => {
        if (err) console.error('Error trimming statuses:', err);
        else console.log('✅ Statuses trimmed.');
    });

    // 2. Ensure specific candidate is set correctly if they were in the middle of an interview
    db.run("UPDATE participants SET status = 'interviewing' WHERE status LIKE '%interviewing%'", (err) => {
        if (err) console.error('Error fixing interviewing status:', err);
        else console.log('✅ Interviewing statuses normalized.');
    });

    // 3. Verify
    db.all("SELECT id, name, status FROM participants WHERE status = 'interviewing'", (err, rows) => {
        console.log('Current Interviewing Participants:', JSON.stringify(rows, null, 2));
        db.close();
    });
});
