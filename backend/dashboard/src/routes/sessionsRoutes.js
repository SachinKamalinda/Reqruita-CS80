const express = require("express");

const sessionsController = require("../controllers/sessionsController");
const authenticateToken = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/sessions/bootstrap", authenticateToken, sessionsController.getBootstrap);
router.get("/sessions/jobs", authenticateToken, sessionsController.getJobs);
router.get(
  "/sessions/interviewers",
  authenticateToken,
  sessionsController.getInterviewers,
);
router.get("/sessions/candidates", authenticateToken, sessionsController.getCandidates);
router.get("/sessions/list", authenticateToken, sessionsController.listSessions);
router.get("/sessions/email-templates", authenticateToken, sessionsController.getEmailTemplates);
router.put(
  "/sessions/email-templates/:templateKey",
  authenticateToken,
  sessionsController.updateEmailTemplate,
);
router.get("/sessions/email-logs", authenticateToken, sessionsController.getEmailLogs);

router.post("/sessions", authenticateToken, sessionsController.createSession);
router.post(
  "/sessions/assign-candidate",
  authenticateToken,
  sessionsController.assignCandidate,
);
router.post(
  "/sessions/send-assignment-email",
  authenticateToken,
  sessionsController.sendAssignmentEmailToCandidate,
);
router.post(
  "/sessions/:sessionId/conduct",
  authenticateToken,
  sessionsController.conductSession,
);
router.post(
  "/sessions/:sessionId/send-schedule-emails",
  authenticateToken,
  sessionsController.sendScheduleEmails,
);
router.post(
  "/sessions/:sessionId/send-result-emails",
  authenticateToken,
  sessionsController.sendResultEmails,
);
router.post(
  "/sessions/:sessionId/send-candidate-email",
  authenticateToken,
  sessionsController.sendCandidateEmail,
);
router.patch(
  "/sessions/:sessionId/candidates/:candidateId",
  authenticateToken,
  sessionsController.updateSessionCandidateDetails,
);
router.get(
  "/sessions/:sessionId/candidates/:candidateId/packet",
  authenticateToken,
  sessionsController.getCandidatePacket,
);
router.get("/sessions/:sessionId", authenticateToken, sessionsController.getSessionById);

module.exports = router;
