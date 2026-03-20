const mongoose = require("mongoose");

const sessionInterviewerSchema = new mongoose.Schema(
  {
    interviewerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    specialty: {
      type: String,
      required: true,
      trim: true,
    },
    linkedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SessionInterviewer", sessionInterviewerSchema);
