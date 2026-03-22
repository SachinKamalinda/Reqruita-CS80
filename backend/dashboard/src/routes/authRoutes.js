const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

/**
 * AUTHENTICATION ROUTES
 * Base Path: /api
 * Note: These routes are public (no authenticateToken middleware required).
 */

// Step 1: User self-registration (creates Company + Admin)
router.post("/register", authController.register);

// Local login (returns JWT token)
router.post("/login", authController.login);

// Email verification after signup or on first login
router.post("/verify-email", authController.verifyEmail);

// Password recovery flow
router.post("/forgot-password/request", authController.forgotPasswordRequest);
router.post("/forgot-password/reset", authController.forgotPasswordReset);

// Completion step for users invited by another admin
router.post("/set-password", authController.setPasswordFromInvite);

module.exports = router;
