const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const authenticateToken = require("../middlewares/authMiddleware");

// /api/me
router.get("/me", authenticateToken, dashboardController.getMe);

// /api/settings
router.get("/settings", authenticateToken, dashboardController.getSettings);
router.put("/settings", authenticateToken, dashboardController.updateSettings);
router.put(
  "/settings/password",
  authenticateToken,
  dashboardController.changePassword,
);

// /api/dashboard/users
router.get("/dashboard/users", authenticateToken, dashboardController.getUsers);
router.post(
  "/dashboard/users/add-user",
  authenticateToken,
  dashboardController.addUser,
);
router.put(
  "/dashboard/users/:id",
  authenticateToken,
  dashboardController.updateUser,
);
router.delete(
  "/dashboard/users/:id",
  authenticateToken,
  dashboardController.deleteUser,
);

module.exports = router;
