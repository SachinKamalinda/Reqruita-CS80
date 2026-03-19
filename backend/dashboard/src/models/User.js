const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, trim: true, default: "" },
    companyName: { type: String, trim: true, default: "" },
    industry: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    role: { type: String, enum: ["admin", "interviewer", "recruiter", "hr manager", "candidate"], required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationOtpHash: { type: String, default: null },
    emailVerificationOtpExpiresAt: { type: Date, default: null },
    emailVerificationOtpSentAt: { type: Date, default: null },
    resetPasswordOtpHash: { type: String, default: null },
    resetPasswordOtpExpiresAt: { type: Date, default: null },
    resetPasswordOtpSentAt: { type: Date, default: null },
    isMainAdmin: { type: Boolean, default: false },
    visiblePassword: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
