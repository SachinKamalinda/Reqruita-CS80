const mongoose = require("mongoose");

const sessionCandidateSlotSchema = new mongoose.Schema(
  {
    candidateId: {
      type: String,
      required: true,
      trim: true,
    },
    slotTime: {
      type: String,
      default: "",
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: 10,
      max: 120,
    },
    result: {
      type: String,
      enum: ["Pending", "Passed", "Failed", "On Hold"],
      default: "Pending",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false },
);

const interviewSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    jobId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    interviewerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    requirements: {
      type: String,
      required: true,
      trim: true,
    },
    remarks: {
      type: String,
      required: true,
      trim: true,
    },
    sessionDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      default: "09:00",
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 30,
      min: 10,
      max: 120,
    },
    meetingId: {
      type: String,
      trim: true,
      default: function () {
        return this.sessionId ? `MEET-${this.sessionId}` : "";
      },
    },
    meetingPassword: {
      type: String,
      trim: true,
      default: function () {
        const source = String(this.sessionId || "REQRUITA").replace(
          /[^A-Za-z0-9]/g,
          "",
        );
        const suffix = source.slice(-6).toUpperCase().padStart(6, "0");
        return `RQ${suffix}`;
      },
    },
    status: {
      type: String,
      enum: ["Draft", "Scheduled", "Completed"],
      default: "Draft",
    },
    candidates: {
      type: [sessionCandidateSlotSchema],
      default: [],
    },
    lastEmailAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
