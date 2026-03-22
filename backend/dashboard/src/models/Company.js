const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    /**
     * UNIQUE IDENTIFIER: COM-XXXXXX
     * Human-readable ID used for internal tracking and display.
     */
    companyCode: {
        type: String,
        trim: true,
        uppercase: true,
        unique: true,
        sparse: true,
        index: true,
    },

    /**
     * HIERARCHY LINK:
     * Stores the ID of the person who originally registered the company.
     * This establishes the 'Main Admin' link from both the User and Company sides.
     */
    mainAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    
    // Subscription tier for this organization
    plan: { type: String, enum: ["free", "pro", "enterprise"], default: "pro" },
    
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("Company", companySchema);
