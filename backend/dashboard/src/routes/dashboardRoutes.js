const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const authenticateToken = require("../middlewares/authMiddleware");

// /api/me
router.get("/me", authenticateToken, dashboardController.getMe);

// /api/dashboard/users
router.get("/dashboard/users", authenticateToken, dashboardController.getUsers);
router.post("/dashboard/users/add-user", authenticateToken, dashboardController.addUser);
router.put("/dashboard/users/:id", authenticateToken, dashboardController.updateUser);
router.delete("/dashboard/users/:id", authenticateToken, dashboardController.deleteUser);

module.exports = router;
