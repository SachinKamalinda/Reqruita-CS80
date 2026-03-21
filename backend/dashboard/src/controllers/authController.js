const mongoose = require("mongoose");
const User = require("../models/User");
const Company = require("../models/Company");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail } = require("../config/resend");
const { generateUniqueCode } = require("../utils/codeGenerator");

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_here";
const RESET_OTP_EXPIRES_MINUTES = 10;
const RESET_PASSWORD_WEB_URL = "http://localhost:3000/forgot-password";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const toNumericSuffix = (value, size = 6) =>
    String(value || "")
        .replace(/\D/g, "")
        .slice(-size)
        .padStart(size, "0");

exports.register = async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, phoneNumber, companyName, industry, country, address } = req.body;
        const normalizedEmail = (email || "").trim().toLowerCase();

        if (!firstName || !lastName || !normalizedEmail || !password) {
            return res.status(400).json({ message: "First name, last name, email, and password are required." });
        }
        if (!isValidEmail(normalizedEmail)) return res.status(400).json({ message: "Please enter a valid email." });
        if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match." });
        if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) return res.status(400).json({ message: "An account with this email already exists." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const verificationOtp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(verificationOtp, 10);
        const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        const companyCode = await generateUniqueCode(Company, "companyCode", "COM");
        const userCode = await generateUniqueCode(User, "userCode", "USR");

        // 0) Create Company first
        const newCompany = new Company({
            name: companyName || "My New Company",
            companyCode,
            mainAdminId: new mongoose.Types.ObjectId() // temp ID
        });

        const newUser = new User({
            firstName, lastName, email: normalizedEmail, password: hashedPassword,
            phoneNumber: phoneNumber || "", companyName: companyName || "", 
            industry: industry || "", country: country || "", address: address || "",
            role: "admin", isEmailVerified: false,
            emailVerificationOtpHash: otpHash, emailVerificationOtpExpiresAt: otpExpiresAt,
            emailVerificationOtpSentAt: new Date(), isMainAdmin: true,
            companyId: newCompany._id,
            companyCode,
            userCode,
        });

        newCompany.mainAdminId = newUser._id;
        await newCompany.save();
        await newUser.save();

        await sendEmail({
            to: normalizedEmail, firstName, otp: verificationOtp,
            subject: "Verify your Reqruita email", type: "verify-email"
        });

        res.status(201).json({
            message: "Account created! Please verify your email to complete signup.",
            requiresEmailVerification: true, email: normalizedEmail
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = (email || "").trim().toLowerCase();

        if (!normalizedEmail || !password) return res.status(400).json({ message: "Email and password are required." });

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(400).json({ message: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

        if (user.status === "inactive") return res.status(403).json({ message: "Account deactivated." });

        if (!user.isEmailVerified) {
            const verificationOtp = crypto.randomInt(100000, 1000000).toString();
            const otpHash = await bcrypt.hash(verificationOtp, 10);
            const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

            user.emailVerificationOtpHash = otpHash;
            user.emailVerificationOtpExpiresAt = otpExpiresAt;
            user.emailVerificationOtpSentAt = new Date();
            await user.save();

            await sendEmail({
                to: normalizedEmail, firstName: user.firstName, otp: verificationOtp,
                subject: "Verify your Reqruita email", type: "signin-verification"
            });

            return res.json({
                message: "Please verify your email to complete sign-in.",
                requiresEmailVerification: true, email: normalizedEmail
            });
        }

        const token = jwt.sign({ id: user._id, role: user.role, companyId: user.companyId }, JWT_SECRET, { expiresIn: "24h" });

        res.json({
            message: "Login successful", token,
            user: {
                id: user._id,
                userId: user.userCode || `USR-${toNumericSuffix(user._id)}`,
                fullName: `${user.firstName} ${user.lastName}`,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                companyCode:
                                    user.companyCode || `COM-${toNumericSuffix(user.companyId)}`,
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const normalizedEmail = (email || "").trim().toLowerCase();
        const normalizedOtp = (otp || "").trim();

        if (!normalizedEmail || !normalizedOtp) return res.status(400).json({ message: "Email and OTP are required." });

        const user = await User.findOne({ email: normalizedEmail });
        if (!user || !user.emailVerificationOtpHash || !user.emailVerificationOtpExpiresAt) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        if (new Date() > new Date(user.emailVerificationOtpExpiresAt)) {
            user.emailVerificationOtpHash = null; user.emailVerificationOtpExpiresAt = null; user.emailVerificationOtpSentAt = null;
            await user.save();
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        const isOtpValid = await bcrypt.compare(normalizedOtp, user.emailVerificationOtpHash);
        if (!isOtpValid) return res.status(400).json({ message: "Invalid or expired OTP." });

        user.isEmailVerified = true;
        user.emailVerificationOtpHash = null; user.emailVerificationOtpExpiresAt = null; user.emailVerificationOtpSentAt = null;
        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role, companyId: user.companyId }, JWT_SECRET, { expiresIn: "24h" });

        res.json({
            message: "Email verified successfully!", token,
            user: {
                id: user._id,
                userId: user.userCode || `USR-${toNumericSuffix(user._id)}`,
                fullName: `${user.firstName} ${user.lastName}`,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                companyCode:
                                    user.companyCode || `COM-${toNumericSuffix(user.companyId)}`,
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.forgotPasswordRequest = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = (email || "").trim().toLowerCase();
        if (!normalizedEmail || !isValidEmail(normalizedEmail)) return res.status(400).json({ message: "Please enter a valid email." });

        const genericMessage = "If an account exists with this email, reset instructions have been sent.";
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.json({ message: genericMessage });

        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + RESET_OTP_EXPIRES_MINUTES * 60 * 1000);

        user.resetPasswordOtpHash = otpHash;
        user.resetPasswordOtpExpiresAt = expiresAt;
        user.resetPasswordOtpSentAt = new Date();
        await user.save();

        const resetUrl = `${RESET_PASSWORD_WEB_URL}?email=${encodeURIComponent(normalizedEmail)}`;

        await sendEmail({
            to: normalizedEmail, firstName: user.firstName, otp,
            subject: "Reset your Reqruita password", type: "reset-password", resetUrl
        });

        return res.json({ message: genericMessage });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

exports.forgotPasswordReset = async (req, res) => {
    try {
        const { email, otp, newPassword, confirmPassword } = req.body;
        const normalizedEmail = (email || "").trim().toLowerCase();
        const normalizedOtp = (otp || "").trim();

        if (!normalizedEmail || !isValidEmail(normalizedEmail)) return res.status(400).json({ message: "Please enter a valid email." });
        if (!normalizedOtp || !newPassword || !confirmPassword) return res.status(400).json({ message: "Email, OTP, new password, and confirm password are required." });
        if (newPassword !== confirmPassword) return res.status(400).json({ message: "Passwords do not match." });
        if (newPassword.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });

        const user = await User.findOne({ email: normalizedEmail });
        if (!user || !user.resetPasswordOtpHash || !user.resetPasswordOtpExpiresAt) return res.status(400).json({ message: "Invalid or expired OTP." });

        if (new Date() > new Date(user.resetPasswordOtpExpiresAt)) {
            user.resetPasswordOtpHash = null; user.resetPasswordOtpExpiresAt = null; user.resetPasswordOtpSentAt = null;
            await user.save();
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        const isOtpValid = await bcrypt.compare(normalizedOtp, user.resetPasswordOtpHash);
        if (!isOtpValid) return res.status(400).json({ message: "Invalid or expired OTP." });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordOtpHash = null; user.resetPasswordOtpExpiresAt = null; user.resetPasswordOtpSentAt = null;
        await user.save();

        return res.json({ message: "Password reset successful. Please sign in." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

exports.setPasswordFromInvite = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ message: "Token and password are required." });
        if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });

        const user = await User.findOne({ 
            inviteToken: token,
            inviteExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired invitation token." });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.inviteToken = null;
        user.inviteExpires = null;
        user.isInvited = false;
        user.isEmailVerified = true; // Setting password from invite also verifies email
        
        await user.save();
        res.json({ message: "Password set successfully! You can now sign in." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
