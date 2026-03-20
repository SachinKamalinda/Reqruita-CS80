const { Resend } = require("resend");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "";
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || "Reqruita";
const RESET_OTP_EXPIRES_MINUTES = Number(process.env.RESET_OTP_EXPIRES_MINUTES || 10);
const RESET_PASSWORD_WEB_URL = process.env.RESET_PASSWORD_WEB_URL || "http://localhost:3000/forgot-password";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    console.warn("Resend is not fully configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL to send forgot-password emails.");
}

const sendEmail = async ({ to, firstName, otp, subject, type, resetUrl }) => {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
        console.warn("[Email] Skipping email because Resend is not configured.");
        return false;
    }

    const from = RESEND_FROM_NAME ? `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>` : RESEND_FROM_EMAIL;
    let text = "";

    if (type === "verify-email") {
        text = `Hi ${firstName || "there"},\n\nWelcome to Reqruita! Please verify your email with this code:\n\n${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not create this account, please ignore this email.`;
    } else if (type === "signin-verification") {
        text = `Hi ${firstName || "there"},\n\nVerify your sign-in with this code:\n\n${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not attempt to sign in, please ignore this email.`;
    } else if (type === "reset-password") {
        text = `Hi ${firstName || "there"},\n\nReset your Reqruita password with this code:\n\n${otp}\n\nThis code expires in ${RESET_OTP_EXPIRES_MINUTES} minutes.\n\nReset here: ${resetUrl}\n\nIf you did not request this, please ignore this email.`;
    } else if (type === "invite-user") {
        text = `Hi ${firstName || "there"},\n\nYou have been invited to join the Reqruita dashboard.\n\nPlease set up your account password by clicking the link below:\n\n${resetUrl || ""}\n\nThis link expires in 24 hours.\n\nWelcome aboard!`;
    }

    try {
        await resend.emails.send({ from, to, subject, text });
        console.log(`[Email] ${type} email sent successfully to ${to}`);
        return true;
    } catch (error) {
        console.error(`[Email] Failed to send ${type} email:`, error);
        return false;
    }
};

module.exports = {
    sendEmail,
    RESET_OTP_EXPIRES_MINUTES,
    RESET_PASSWORD_WEB_URL
};
