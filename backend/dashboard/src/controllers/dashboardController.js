const User = require("../models/User");
const bcrypt = require("bcryptjs");

// GET /api/me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
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
};

// GET /api/dashboard/users
exports.getUsers = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access Denied: Requires Admin Role" });
        }
        const users = await User.find({}, "-password").sort({ createdAt: -1 });
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

        const { email, password, role, firstName, lastName } = req.body;
        const validRoles = ["admin", "interviewer", "recruiter", "hr manager", "candidate"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role selected" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const finalFirstName = firstName || (role.charAt(0).toUpperCase() + role.slice(1));
        const finalLastName = lastName || "User";
        const fullName = `${finalFirstName} ${finalLastName}`;

        const newUser = new User({
            firstName: finalFirstName,
            lastName: finalLastName,
            fullName,
            email,
            password: hashedPassword,
            visiblePassword: password, // As requested in original Dashboard logic
            role,
            status: "active",
            isMainAdmin: false
        });

        await newUser.save();
        res.status(201).json({ message: "User added successfully!", user: { id: newUser._id, email: newUser.email, role: newUser.role, fullName: newUser.fullName } });
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

        const userToUpdate = await User.findById(targetUserId);
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
            return res.status(403).json({ message: "Access Denied: Requires Admin Role" });
        }

        const targetUserId = req.params.id;
        const userToDelete = await User.findById(targetUserId);

        if (!userToDelete) return res.status(404).json({ message: "User not found" });
        if (userToDelete.isMainAdmin) return res.status(403).json({ message: "Cannot remove a Main Admin" });
        if (targetUserId === req.user.id) return res.status(400).json({ message: "Cannot remove yourself" });

        await User.findByIdAndDelete(targetUserId);
        res.status(200).json({ message: "User successfully removed" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
