const mongoose = require("mongoose");

const sessionEmailTemplateSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    templateKey: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

sessionEmailTemplateSchema.index({ companyId: 1, templateKey: 1 }, { unique: true });

module.exports = mongoose.model("SessionEmailTemplate", sessionEmailTemplateSchema);
