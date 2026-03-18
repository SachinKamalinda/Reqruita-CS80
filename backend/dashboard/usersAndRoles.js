const express = require('express');
const bcrypt = require('bcryptjs');

module.exports = (User, authenticateToken) => {
    const router = express.Router();

    // Get all users - Admins only
    router.get('/', authenticateToken, async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: "Access Denied: Requires Admin Role" });
            }

            // Exclude hashed password for security, but we will return visiblePassword for the dashboard as requested
            const users = await User.find({}, '-password').sort({ createdAt: -1 });
            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Add New User Route - Admins only
    router.post('/add-user', authenticateToken, async (req, res) => {
        try {
            console.log("POST /add-user Request Body:", req.body);
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: "Access Denied: Requires Admin Role" });
            }

            const { email, password, role, firstName, lastName } = req.body;

            // Validate role
            const validRoles = ['admin', 'interviewer', 'recruiter', 'hr manager', 'candidate'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ message: "Invalid role selected" });
            }

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "Email already registered" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Use provided names or fallback to role-based defaults
            const finalFirstName = firstName || (role.charAt(0).toUpperCase() + role.slice(1));
            const finalLastName = lastName || "User";
            const fullName = `${finalFirstName} ${finalLastName}`;

            const newUser = new User({
                firstName: finalFirstName,
                lastName: finalLastName,
                fullName,
                email,
                password: hashedPassword,
                visiblePassword: password, // For dashboard viewing as requested
                role,
                status: 'active',
                isMainAdmin: false
            });

            await newUser.save();
            res.status(201).json({ message: "User added successfully!", user: { id: newUser._id, email: newUser.email, role: newUser.role, fullName: newUser.fullName } });
        } catch (error) {
            console.error("Error adding user:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // Edit User Role Route - Admins only
    router.put('/:id', authenticateToken, async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: "Access Denied: Requires Admin Role" });
            }

            const { role, status } = req.body;
            const targetUserId = req.params.id;

            const validRoles = ['admin', 'interviewer', 'recruiter', 'hr manager', 'candidate'];
            if (role && !validRoles.includes(role)) {
                return res.status(400).json({ message: "Invalid role selected" });
            }

            if (status && !['active', 'inactive'].includes(status)) {
                return res.status(400).json({ message: "Invalid status selected" });
            }

            const userToUpdate = await User.findById(targetUserId);
            if (!userToUpdate) {
                return res.status(404).json({ message: "User not found" });
            }

            if (userToUpdate.isMainAdmin && role && role !== 'admin') {
                return res.status(403).json({ message: "Cannot change the role of a Main Admin" });
            }

            if (role) userToUpdate.role = role;
            if (status) userToUpdate.status = status;
            
            await userToUpdate.save();

            res.status(200).json({ message: "User updated successfully" });
        } catch (error) {
            console.error("Error updating user:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // Remove User Route - Admins only
    router.delete('/:id', authenticateToken, async (req, res) => {
        try {
            console.log(`[Delete] Attempting to remove user ID: ${req.params.id} by admin: ${req.user.id}`);
            
            if (req.user.role !== 'admin') {
                console.warn(`[Delete] Access Denied for role: ${req.user.role}`);
                return res.status(403).json({ message: "Access Denied: Requires Admin Role" });
            }

            const targetUserId = req.params.id;
            const userToDelete = await User.findById(targetUserId);

            if (!userToDelete) {
                console.warn(`[Delete] User not found: ${targetUserId}`);
                return res.status(404).json({ message: "User not found" });
            }

            if (userToDelete.isMainAdmin) {
                console.warn(`[Delete] Blocked: Cannot remove Main Admin: ${userToDelete.email}`);
                return res.status(403).json({ message: "Cannot remove a Main Admin" });
            }

            if (targetUserId === req.user.id) {
                console.warn(`[Delete] Blocked: Self-removal attempt by: ${userToDelete.email}`);
                return res.status(400).json({ message: "Cannot remove yourself" });
            }

            await User.findByIdAndDelete(targetUserId);
            console.log(`[Delete] Success: Removed user: ${userToDelete.email}`);
            res.status(200).json({ message: "User successfully removed" });
        } catch (error) {
            console.error("[Delete] Server Error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
