const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String,},
    phoneNumber: { type: String, trim: true, default: "" },
    companyName: { type: String, trim: true, default: "" },
    jobTitle: { type: String, trim: true, default: "" },
    industry: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    userCode: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      index: true,
    },
    companyCode: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
      default: "",
    },
    notificationPreferences: {
      weeklyDigest: { type: Boolean, default: true },
      interviewReminders: { type: Boolean, default: true },
      candidateAlerts: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
    },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    role: { type: String, enum: ["admin", "interviewer", "recruiter", "hr manager", "candidate"], required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isEmailVerified: { type: Boolean, default: false },
    isInvited: { type: Boolean, default: false },
    inviteToken: { type: String, default: null, index: true },
    inviteExpires: { type: Date, default: null },
    emailVerificationOtpHash: { type: String, default: null },
    emailVerificationOtpExpiresAt: { type: Date, default: null },
    emailVerificationOtpSentAt: { type: Date, default: null },
    resetPasswordOtpHash: { type: String, default: null },
    resetPasswordOtpExpiresAt: { type: Date, default: null },
    resetPasswordOtpSentAt: { type: Date, default: null },
    isMainAdmin: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
