const jwt = require("jsonwebtoken");
const path = require("path");
const User = require("../models/User");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_here";

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    
    if (!token) {
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.id)
            .select("_id role companyId status")
            .lean();

        if (!user) {
            return res.status(401).json({ message: "Session expired. User account no longer exists." });
        }

        if (String(user.status || "active").toLowerCase() !== "active") {
            return res.status(401).json({ message: "Your account is inactive. Please contact an administrator." });
        }

        req.user = {
            id: String(user._id),
            role: user.role,
            companyId: user.companyId,
        };

        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid Token" });
    }
};

module.exports = authenticateToken;
