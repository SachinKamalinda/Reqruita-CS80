const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    companyCode: {
        type: String,
        trim: true,
        uppercase: true,
        unique: true,
        sparse: true,
        index: true,
    },
    mainAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: String, enum: ["free", "pro", "enterprise"], default: "pro" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("Company", companySchema);
