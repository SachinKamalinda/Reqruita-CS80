const mongoose = require("mongoose");

const jobFormSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fields: [
      {
        label: { type: String, required: true, trim: true },
        type: {
          type: String,
          enum: ["text", "phone", "email", "file", "link"],
          default: "text",
        },
        required: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
      },
    ],
    isActive: { type: Boolean, default: true },
    submissionCount: { type: Number, default: 0 },
    jobRole: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("JobForm", jobFormSchema);
