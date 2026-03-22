const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendEmail, sendCustomEmail } = require("../config/resend");
const { generateUniqueCode } = require("../utils/codeGenerator");

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const toNumericSuffix = (value, size = 6) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(-size)
    .padStart(size, "0");

const ALLOWED_DASHBOARD_ROLES = ["admin", "interviewer"];

const mapUserResponse = (user) => ({
  id: user._id,
  userId: user.userCode || `USR-${toNumericSuffix(user._id)}`,
  fullName: `${user.firstName} ${user.lastName}`,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  isMainAdmin: user.isMainAdmin,
  companyId: user.companyId,
  companyCode: user.companyCode || `COM-${toNumericSuffix(user.companyId)}`,
  companyName: user.companyName,
  jobTitle: user.jobTitle,
  industry: user.industry,
  country: user.country,
  notificationPreferences: {
    weeklyDigest: user.notificationPreferences?.weeklyDigest ?? true,
    interviewReminders:
      user.notificationPreferences?.interviewReminders ?? true,
    candidateAlerts: user.notificationPreferences?.candidateAlerts ?? true,
    securityAlerts: user.notificationPreferences?.securityAlerts ?? true,
  },
});

// GET /api/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: mapUserResponse(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/settings
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user: mapUserResponse(user) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// PUT /api/settings
exports.updateSettings = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      companyName,
      jobTitle,
      notificationPreferences,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!firstName || !lastName || !email) {
      return res
        .status(400)
        .json({ message: "First name, last name, and email are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email." });
    }

    if (normalizedEmail !== user.email) {
      const existingEmailUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });
      if (existingEmailUser) {
        return res
          .status(400)
          .json({ message: "Email is already in use by another account." });
      }
    }

    user.firstName = String(firstName).trim();
    user.lastName = String(lastName).trim();
    user.fullName = `${user.firstName} ${user.lastName}`;
    user.email = normalizedEmail;
    user.companyName = companyName ? String(companyName).trim() : "";
    user.jobTitle = jobTitle ? String(jobTitle).trim() : "";

    if (
      notificationPreferences &&
      typeof notificationPreferences === "object"
    ) {
      user.notificationPreferences = {
        weeklyDigest: Boolean(notificationPreferences.weeklyDigest),
        interviewReminders: Boolean(notificationPreferences.interviewReminders),
        candidateAlerts: Boolean(notificationPreferences.candidateAlerts),
        securityAlerts: Boolean(notificationPreferences.securityAlerts),
      };
    }

    await user.save();

    return res.status(200).json({
      message: "Settings updated successfully.",
      user: mapUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// PUT /api/settings/password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "Current, new, and confirm password are required." });
    }
    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "New password and confirm password do not match." });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.visiblePassword = newPassword;
    await user.save();

    return res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// GET /api/dashboard/users
exports.getUsers = async (req, res) => {
  try {
    if (!["admin", "interviewer"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Access Denied: Requires Admin or Interviewer Role" });
    }

    const filter = { companyId: req.user.companyId };
    if (req.user.role === "interviewer") {
      filter.role = "admin";
    }

    const users = await User.find(filter, "-password").sort({ createdAt: -1 });
    res.status(200).json(
      users.map((user) => ({
        ...user.toObject(),
        userId: user.userCode || `USR-${toNumericSuffix(user._id)}`,
        companyCode:
          user.companyCode ||
          `COM-${toNumericSuffix(user.companyId)}`,
      })),
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/dashboard/users/add-user
exports.addUser = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access Denied: Requires Admin Role" });
        }

        const { email, role, firstName, lastName } = req.body;
        if (!ALLOWED_DASHBOARD_ROLES.includes(role)) {
            return res.status(400).json({ message: "Invalid role selected" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const inviteToken = crypto.randomBytes(32).toString("hex");
        const inviteExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const finalFirstName = firstName || (role.charAt(0).toUpperCase() + role.slice(1));
        const finalLastName = lastName || "User";
        const fullName = `${finalFirstName} ${finalLastName}`;

        const inviter = await User.findById(req.user.id).select("companyId companyName companyCode");
        if (!inviter) {
          return res.status(404).json({ message: "Inviter account not found" });
        }

        const companyContext = await User.findOne({
          companyId: inviter.companyId,
          role: "admin",
          isMainAdmin: true,
        }).select("companyId companyName companyCode");

        const companyId = companyContext?.companyId || inviter.companyId;
        const companyName =
          (companyContext?.companyName || inviter.companyName || "").trim();
        const companyCode =
          (companyContext?.companyCode || inviter.companyCode || "").trim() ||
          `COM-${toNumericSuffix(companyId)}`;
        const userCode = await generateUniqueCode(User, "userCode", "USR");

        const newUser = new User({
            firstName: finalFirstName,
            lastName: finalLastName,
            fullName,
            email,
            role,
            status: "active",
            isMainAdmin: false,
            isInvited: true,
            inviteToken,
            inviteExpires,
            companyId,
            companyName,
            companyCode,
            userCode,
        });

        await newUser.save();

        const dashboardBaseUrl = process.env.DASHBOARD_URL || "http://localhost:3000";
        const setupLink = `${dashboardBaseUrl}/set-password?token=${inviteToken}`;
        
        await sendEmail({
            to: email,
            firstName: finalFirstName,
            subject: "You've been invited to Reqruita",
            type: "invite-user",
            resetUrl: setupLink
        });

        res.status(201).json({
          message: "Invitation sent successfully!",
          user: {
            id: newUser._id,
            userId: newUser.userCode,
            companyCode: newUser.companyCode,
            email: newUser.email,
            role: newUser.role,
            fullName: newUser.fullName,
          },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PUT /api/dashboard/users/:id
exports.updateUser = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access Denied: Requires Admin Role" });
        }

        const { role, status } = req.body;
        const targetUserId = req.params.id;

        if (role && !ALLOWED_DASHBOARD_ROLES.includes(role)) {
            return res.status(400).json({ message: "Invalid role selected" });
        }

        if (status && !["active", "inactive"].includes(status)) {
            return res.status(400).json({ message: "Invalid status selected" });
        }

        const userToUpdate = await User.findOne({ _id: targetUserId, companyId: req.user.companyId });
        if (!userToUpdate) return res.status(404).json({ message: "User not found" });

        // Normal admins can't edit other admins or the main admin
        if (userToUpdate.role === "admin" && !req.user.isMainAdmin) {
            return res.status(403).json({ message: "Only Main Admin can edit other administrators" });
        }

        if (userToUpdate.isMainAdmin && role && role !== "admin") {
            return res.status(403).json({ message: "Cannot change the role of a Main Admin" });
        }

        if (role) userToUpdate.role = role;
        if (status) userToUpdate.status = status;
        
        await userToUpdate.save();
        res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// DELETE /api/dashboard/users/:id
exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access Denied: Requires Admin Role" });
    }

        const targetUserId = req.params.id;
        const userToDelete = await User.findOne({ _id: targetUserId, companyId: req.user.companyId });

        if (!userToDelete)
            return res.status(404).json({ message: "User not found" });

        // Normal admins can't remove other admins or the main admin
        if (userToDelete.role === "admin" && !req.user.isMainAdmin) {
            return res.status(403).json({ message: "Only Main Admin can remove other administrators" });
        }

        if (userToDelete.isMainAdmin)
            return res.status(403).json({ message: "Cannot remove a Main Admin" });
        
        if (targetUserId === req.user.id)
            return res.status(400).json({ message: "Cannot remove yourself" });

        await User.findOneAndDelete({ _id: targetUserId, companyId: req.user.companyId });

        // Best-effort notification for removed users; deletion should still succeed
        const recipientName =
          `${String(userToDelete.firstName || "").trim()} ${String(userToDelete.lastName || "").trim()}`.trim() ||
          String(userToDelete.fullName || "").trim() ||
          "User";

        await sendCustomEmail({
          to: userToDelete.email,
          subject: "Your Reqruita dashboard access has been removed",
          text:
            `Dear ${recipientName},\n\n` +
            "This is to inform you that your access to the Reqruita dashboard has been removed by your company administrator.\n\n" +
            "If you believe this was done in error, please contact your administrator.\n\n" +
            "Regards,\nReqruita Team",
        });

        res.status(200).json({ message: "User successfully removed" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
