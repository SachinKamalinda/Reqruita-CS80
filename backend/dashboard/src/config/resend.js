const { Resend } = require("resend");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "";
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || "Reqruita";
const RESET_OTP_EXPIRES_MINUTES = Number(process.env.RESET_OTP_EXPIRES_MINUTES || 10);
const RESET_PASSWORD_WEB_URL = process.env.RESET_PASSWORD_WEB_URL || "http://localhost:3000/forgot-password";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const buildFromAddress = () =>
    RESEND_FROM_NAME ? `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>` : RESEND_FROM_EMAIL;
const isResendConfigured = () => Boolean(resend && RESEND_API_KEY && RESEND_FROM_EMAIL);

if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    console.warn("Resend is not fully configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL to send forgot-password emails.");
}

const sendCustomEmail = async ({ to, subject, text, html }) => {
    if (!isResendConfigured()) {
        return {
            sent: false,
            reason: "Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
        };
    }

    const recipients = Array.isArray(to)
        ? to.map((item) => String(item || "").trim()).filter(Boolean)
        : [String(to || "").trim()].filter(Boolean);

    if (recipients.length === 0) {
        return { sent: false, reason: "A recipient email address is required." };
    }

    const normalizedSubject = String(subject || "").trim();
    if (!normalizedSubject) {
        return { sent: false, reason: "Email subject is required." };
    }

    const normalizedText = typeof text === "string" ? text : "";
    const normalizedHtml = typeof html === "string" ? html : "";

    if (!normalizedText && !normalizedHtml) {
        return { sent: false, reason: "Email content cannot be empty." };
    }

    try {
        await resend.emails.send({
            from: buildFromAddress(),
            to: recipients,
            subject: normalizedSubject,
            ...(normalizedText ? { text: normalizedText } : {}),
            ...(normalizedHtml ? { html: normalizedHtml } : {}),
        });

        console.log(`[Email] Custom email sent successfully to ${recipients.join(", ")}`);
        return { sent: true };
    } catch (error) {
        const reason = error instanceof Error ? error.message : "Failed to send email";
        console.error("[Email] Custom email send failed:", error);
        return { sent: false, reason };
    }
};

const sendEmail = async ({ to, firstName, otp, subject, type, resetUrl }) => {
    if (!isResendConfigured()) {
        console.warn("[Email] Skipping email because Resend is not configured.");
        return false;
    }

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

    const result = await sendCustomEmail({ to, subject, text });
    if (result.sent) {
        console.log(`[Email] ${type} email sent successfully to ${to}`);
        return true;
    }

    console.error(`[Email] Failed to send ${type} email: ${result.reason || "Unknown error"}`);
    return false;
};

module.exports = {
    sendEmail,
    sendCustomEmail,
    isResendConfigured,
    RESET_OTP_EXPIRES_MINUTES,
    RESET_PASSWORD_WEB_URL
};
