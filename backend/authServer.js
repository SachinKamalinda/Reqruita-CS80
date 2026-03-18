const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');
const { Resend } = require('resend');

const app = express();
app.use(express.json());
app.use(cors());

console.log('Starting Auth Server...');

require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reqruita';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || '';
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || 'Reqruita';
const RESET_OTP_EXPIRES_MINUTES = Number(
  process.env.RESET_OTP_EXPIRES_MINUTES || 10,
);
const RESET_PASSWORD_WEB_URL =
  process.env.RESET_PASSWORD_WEB_URL ||
  'http://localhost:3000/forgot-password';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log(' Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error(' MongoDB Connection Error:', err.message);
    if (err.message.includes('querySrv ECONNREFUSED')) {
      console.error(
        ' [Troubleshooting Tip]: This is likely a DNS issue. Try restarting your router, switching to Google DNS (8.8.8.8), or checking if your IP is whitelisted in Atlas.',
      );
    } else if (
      err.message.includes('IP not whitelisted') ||
      err.message.includes('Authentication failed')
    ) {
      console.error(
        " [Troubleshooting Tip]: Please ensure your current IP is whitelisted in MongoDB Atlas 'Network Access' tab.",
      );
    }
  });

if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
  console.warn(
    'Resend is not fully configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL to send forgot-password emails.',
  );
}

// --- User Model ---
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    phoneNumber: { type: String, trim: true, default: '' },
    companyName: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    role: {
      type: String,
      enum: ['admin', 'interviewer'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationOtpHash: { type: String, default: null },
    emailVerificationOtpExpiresAt: { type: Date, default: null },
    emailVerificationOtpSentAt: { type: Date, default: null },
    resetPasswordOtpHash: { type: String, default: null },
    resetPasswordOtpExpiresAt: { type: Date, default: null },
    resetPasswordOtpSentAt: { type: Date, default: null },
    isMainAdmin: { type: Boolean, default: false },
    visiblePassword: { type: String, default: '' },
  },
  { timestamps: true },
);

const User = mongoose.model('User', userSchema);

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const sendEmail = async ({ to, firstName, otp, subject, type, resetUrl }) => {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    console.warn('[Email] Skipping email because Resend is not configured.');
    return false;
  }

  const from = RESEND_FROM_NAME
    ? `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`
    : RESEND_FROM_EMAIL;

  let text = '';
  if (type === 'verify-email') {
    text = `Hi ${firstName || 'there'},\n\nWelcome to Reqruita! Please verify your email with this code:\n\n${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not create this account, please ignore this email.`;
  } else if (type === 'signin-verification') {
    text = `Hi ${firstName || 'there'},\n\nVerify your sign-in with this code:\n\n${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not attempt to sign in, please ignore this email.`;
  } else if (type === 'reset-password') {
    text = `Hi ${firstName || 'there'},\n\nReset your Reqruita password with this code:\n\n${otp}\n\nThis code expires in ${RESET_OTP_EXPIRES_MINUTES} minutes.\n\nReset here: ${resetUrl}\n\nIf you did not request this, please ignore this email.`;
  }

  try {
    const emailData = {
      from,
      to,
      subject,
      text,
    };

    console.log(`[Email] Sending ${type} email to:`, to);
    const response = await resend.emails.send(emailData);
    console.log(`[Email] ${type} email sent successfully`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send ${type} email:`, error);
    return false;
  }
};

// --- Routes ---

// 1. Registration Route - Creates account and sends email verification OTP
app.post('/api/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      phoneNumber,
      companyName,
      industry,
      country,
      address,
    } = req.body;

    const normalizedEmail = (email || '').trim().toLowerCase();

    // Basic field validation
    if (!firstName || !lastName || !normalizedEmail || !password) {
      return res.status(400).json({
        message: 'First name, last name, email, and password are required.',
      });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters.' });
    }

    // Check for existing account
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification OTP
    const verificationOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(verificationOtp, 10);
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const newUser = new User({
      firstName,
      lastName,
      email: normalizedEmail,
      password: hashedPassword,
      phoneNumber: phoneNumber || '',
      companyName: companyName || '',
      industry: industry || '',
      country: country || '',
      address: address || '',
      role: 'admin',
      isEmailVerified: false,
      emailVerificationOtpHash: otpHash,
      emailVerificationOtpExpiresAt: otpExpiresAt,
      emailVerificationOtpSentAt: new Date(),
      isMainAdmin: true,
    });

    await newUser.save();

    // Send verification email
    await sendEmail({
      to: normalizedEmail,
      firstName,
      otp: verificationOtp,
      subject: 'Verify your Reqruita email',
      type: 'verify-email',
    });

    res.status(201).json({
      message: 'Account created! Please verify your email to complete signup.',
      requiresEmailVerification: true,
      email: normalizedEmail,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Login Route - Verifies credentials and sends email verification OTP if not yet verified
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find the user in the database by their email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Compare the provided plain-text password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check account status
    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact your administrator.' });
    }

    // If email not verified, send verification OTP
    if (!user.isEmailVerified) {
      const verificationOtp = crypto.randomInt(100000, 1000000).toString();
      const otpHash = await bcrypt.hash(verificationOtp, 10);
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      user.emailVerificationOtpHash = otpHash;
      user.emailVerificationOtpExpiresAt = otpExpiresAt;
      user.emailVerificationOtpSentAt = new Date();
      await user.save();

      await sendEmail({
        to: normalizedEmail,
        firstName: user.firstName,
        otp: verificationOtp,
        subject: 'Verify your Reqruita email',
        type: 'signin-verification',
      });

      return res.json({
        message: 'Please verify your email to complete sign-in.',
        requiresEmailVerification: true,
        email: normalizedEmail,
      });
    }

    // Create a JSON Web Token (JWT) containing the user's ID and role
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: '24h',
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2.5 Email Verification - Verifies OTP and completes email verification
app.post('/api/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedOtp = (otp || '').trim();

    if (!normalizedEmail || !normalizedOtp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.emailVerificationOtpHash || !user.emailVerificationOtpExpiresAt) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    if (new Date() > new Date(user.emailVerificationOtpExpiresAt)) {
      user.emailVerificationOtpHash = null;
      user.emailVerificationOtpExpiresAt = null;
      user.emailVerificationOtpSentAt = null;
      await user.save();
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const isOtpValid = await bcrypt.compare(normalizedOtp, user.emailVerificationOtpHash);
    if (!isOtpValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpiresAt = null;
    user.emailVerificationOtpSentAt = null;
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: '24h',
    });

    res.json({
      message: 'Email verified successfully!',
      token,
      user: {
        id: user._id,
        fullName: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Forgot Password Request - Sends OTP instructions to email if account exists
app.post('/api/forgot-password/request', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email.' });
    }

    const genericMessage =
      'If an account exists with this email, reset instructions have been sent.';

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({ message: genericMessage });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(
      Date.now() + RESET_OTP_EXPIRES_MINUTES * 60 * 1000,
    );

    user.resetPasswordOtpHash = otpHash;
    user.resetPasswordOtpExpiresAt = expiresAt;
    user.resetPasswordOtpSentAt = new Date();
    await user.save();

    const resetUrl = `${RESET_PASSWORD_WEB_URL}?email=${encodeURIComponent(normalizedEmail)}`;

    await sendEmail({
      to: normalizedEmail,
      firstName: user.firstName,
      otp,
      subject: 'Reset your Reqruita password',
      type: 'reset-password',
      resetUrl,
    });

    return res.json({ message: genericMessage });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Forgot Password Reset - Verifies OTP and updates password
app.post('/api/forgot-password/reset', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedOtp = (otp || '').trim();

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email.' });
    }

    if (!normalizedOtp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: 'Email, OTP, new password, and confirm password are required.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters.' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.resetPasswordOtpHash || !user.resetPasswordOtpExpiresAt) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    if (new Date() > new Date(user.resetPasswordOtpExpiresAt)) {
      user.resetPasswordOtpHash = null;
      user.resetPasswordOtpExpiresAt = null;
      user.resetPasswordOtpSentAt = null;
      await user.save();
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const isOtpValid = await bcrypt.compare(normalizedOtp, user.resetPasswordOtpHash);
    if (!isOtpValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtpHash = null;
    user.resetPasswordOtpExpiresAt = null;
    user.resetPasswordOtpSentAt = null;
    await user.save();

    return res.json({ message: 'Password reset successful. Please sign in.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token)
    return res
      .status(401)
      .json({ message: 'Access Denied: No Token Provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid Token' });
    req.user = user;
    next();
  });
};

// --- Dashboard Routes ---
const usersAndRolesRouter = require('./dashboard/usersAndRoles')(
  User,
  authenticateToken,
);
app.use('/api/dashboard/users', usersAndRolesRouter);

// 5. Get current user - Returns the authenticated user's profile
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      user: {
        id: user._id,
        fullName: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        industry: user.industry,
        country: user.country,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Start Server ---
const PORT = 3003;
app.listen(PORT, () => {
  console.log(`🚀 Auth Server is running on http://localhost:${PORT}`);
});
