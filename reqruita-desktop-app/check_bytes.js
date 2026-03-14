const fs = require('fs');
const buf = fs.readFileSync('src/pages/MeetingInterviewee.jsx').slice(0, 16);
console.log(buf);
console.log(buf.toString('hex'));
