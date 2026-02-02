const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());

// Helper to read DB
const readDB = () => {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
};

// Helper to write DB
const writeDB = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// GET /api/participants
app.get('/api/participants', (req, res) => {
    try {
        const db = readDB();
        res.json(db.participants);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read database' });
    }
});

// POST /api/participants/allow
// Logic: Move current 'interviewing' to 'completed', and the selected 'waiting' to 'interviewing'
app.post('/api/participants/allow', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Participant ID is required' });

    try {
        const db = readDB();
        const participants = db.participants;

        // 1. Move all current 'interviewing' to 'completed'
        participants.forEach(p => {
            if (p.status === 'interviewing') {
                p.status = 'completed';
            }
        });

        // 2. Move the selected participant from 'waiting' to 'interviewing'
        const targetIndex = participants.findIndex(p => p.id === id);
        if (targetIndex === -1) {
            return res.status(404).json({ error: 'Participant not found' });
        }

        participants[targetIndex].status = 'interviewing';

        writeDB(db);
        res.json({ message: 'Success', participants });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update database' });
    }
});

// POST /api/participants/reject
// Logic: Remove someone from the 'waiting' list (or change status to rejected, but user asked to remove)
app.post('/api/participants/reject', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Participant ID is required' });

    try {
        const db = readDB();
        const initialLength = db.participants.length;
        db.participants = db.participants.filter(p => p.id !== id);

        if (db.participants.length === initialLength) {
            return res.status(404).json({ error: 'Participant not found' });
        }

        writeDB(db);
        res.json({ message: 'Participant removed', participants: db.participants });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update database' });
    }
});

app.listen(PORT, () => {
    console.log(`Mock Backend running at http://localhost:${PORT}`);
});
