const mongoose = require("mongoose");

const sessionEmailLogSchema = new mongoose.Schema(
  {
    sentAt: {
      type: Date,
      default: Date.now,
    },
    category: {
      type: String,
      enum: ["Session", "Assignment", "Schedule", "Result", "Reminder"],
      required: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: false },
);

sessionEmailLogSchema.index({ sentAt: -1 });

module.exports = mongoose.model("SessionEmailLog", sessionEmailLogSchema);
