const jwt = require("jsonwebtoken");
const path = require("path");
const User = require("../models/User");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_here";

/**
 * AUTHENTICATION MIDDLEWARE: authenticateToken
 * Used to protect REST API routes.
 * 
 * Logic:
 * 1. Extracts the Bearer token from the 'Authorization' header.
 * 2. Decodes the token using JWT_SECRET.
 * 3. Verifies the user exists and is still marked as 'active'.
 * 4. Populates 'req.user' with essential identity info (id, role, companyId).
 */
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    
    if (!token) {
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Fetch user from DB to ensure they still exist and aren't deactivated
        const user = await User.findById(decoded.id)
            .select("_id role companyId status")
            .lean();

        if (!user) {
            return res.status(401).json({ message: "Session expired. User account no longer exists." });
        }

        // Check if account status is 'active' (case-insensitive check)
        if (String(user.status || "active").toLowerCase() !== "active") {
            return res.status(401).json({ message: "Your account is inactive. Please contact an administrator." });
        }

        /**
         * ATTACH TO REQUEST:
         * This data is used by downstream controllers (e.g., to scope data by companyId)
         */
        req.user = {
            id: String(user._id),
            role: user.role,
            companyId: user.companyId,
            isMainAdmin: !!decoded.isMainAdmin, // Carry forward the main admin flag
        };

        next(); // Proceed to the protected controller
    } catch (err) {
        return res.status(403).json({ message: "Invalid Token" });
    }
};

module.exports = authenticateToken;
