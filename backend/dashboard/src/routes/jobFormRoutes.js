const express = require("express");
const {
  createJobForm,
  getAllJobForms,
  getJobFormById,
  updateJobForm,
  deleteJobForm,
  submitFormResponse,
  getFormSubmissions,
  updateSubmissionStatus,
} = require("../controllers/jobFormController");
const authenticateToken = require("../middlewares/authMiddleware");

const router = express.Router();

// Authenticated routes
router.post("/forms", authenticateToken, createJobForm);
router.get("/forms", authenticateToken, getAllJobForms);
router.get("/forms/:formId/submissions", authenticateToken, getFormSubmissions);
router.put("/forms/:formId", authenticateToken, updateJobForm);
router.delete("/forms/:formId", authenticateToken, deleteJobForm);
router.put(
  "/submissions/:submissionId",
  authenticateToken,
  updateSubmissionStatus,
);

// Public routes (no authentication required)
router.get("/public/forms/:formId", getJobFormById);
router.post("/public/forms/:formId/submit", submitFormResponse);

module.exports = router;
