const mongoose = require("mongoose");

const interviewRemarkSchema = new mongoose.Schema({
    interviewId: { type: String, required: true },
    participantId: { type: String, required: true },
    remark: { type: String, required: true }
}, { 
    timestamps: true 
});

module.exports = mongoose.model("InterviewRemark", interviewRemarkSchema);
