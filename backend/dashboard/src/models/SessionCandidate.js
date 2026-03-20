const mongoose = require("mongoose");

const sessionCandidateSchema = new mongoose.Schema(
  {
    candidateId: {
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
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },
    portfolioUrl: {
      type: String,
      default: "",
      trim: true,
    },
    resumeFile: {
      type: String,
      default: "",
      trim: true,
    },
    appliedDate: {
      type: Date,
      required: true,
    },
    summary: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SessionCandidate", sessionCandidateSchema);
