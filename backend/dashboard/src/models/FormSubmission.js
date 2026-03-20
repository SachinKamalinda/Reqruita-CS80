const mongoose = require("mongoose");

const formSubmissionSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobForm",
      required: true,
    },
    submittedData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      required: true,
    },
    submitterEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ["submitted", "reviewed", "rejected", "accepted"],
      default: "submitted",
    },
    notes: { type: String, default: "" },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    ipAddress: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("FormSubmission", formSubmissionSchema);
