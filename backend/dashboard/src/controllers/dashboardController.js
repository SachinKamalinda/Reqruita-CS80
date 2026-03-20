const User = require("../models/User");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendEmail } = require("../config/resend");

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const mapUserResponse = (user) => ({
  id: user._id,
  fullName: `${user.firstName} ${user.lastName}`,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
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
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access Denied: Requires Admin Role" });
    }

    const filter = { companyId: req.user.companyId };
    const users = await User.find(filter, "-password").sort({ createdAt: -1 });
    res.status(200).json(users);
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
        const validRoles = ["admin", "interviewer", "recruiter", "hr manager", "candidate"];
        if (!validRoles.includes(role)) {
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
            companyId: req.user.companyId
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

        res.status(201).json({ message: "Invitation sent successfully!", user: { id: newUser._id, email: newUser.email, role: newUser.role, fullName: newUser.fullName } });
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

        const validRoles = ["admin", "interviewer", "recruiter", "hr manager", "candidate"];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role selected" });
        }

        if (status && !["active", "inactive"].includes(status)) {
            return res.status(400).json({ message: "Invalid status selected" });
        }

        const userToUpdate = await User.findOne({ _id: targetUserId, companyId: req.user.companyId });
        if (!userToUpdate) return res.status(404).json({ message: "User not found" });

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
    if (userToDelete.isMainAdmin)
      return res.status(403).json({ message: "Cannot remove a Main Admin" });
    if (targetUserId === req.user.id)
      return res.status(400).json({ message: "Cannot remove yourself" });

        await User.findOneAndDelete({ _id: targetUserId, companyId: req.user.companyId });
        res.status(200).json({ message: "User successfully removed" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
