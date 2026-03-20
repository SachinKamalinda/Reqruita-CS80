const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-email", authController.verifyEmail);
router.post("/forgot-password/request", authController.forgotPasswordRequest);
router.post("/forgot-password/reset", authController.forgotPasswordReset);
router.post("/set-password", authController.setPasswordFromInvite);

module.exports = router;
