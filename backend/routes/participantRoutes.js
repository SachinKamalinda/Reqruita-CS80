// backend/routes/participantRoutes.js
const express = require("express");
const router = express.Router();
const participantController = require("../controllers/participantController");

// GET /api/participants
router.get("/", participantController.getParticipants);

// POST /api/participants/allow
router.post("/allow", participantController.allowParticipant);

// POST /api/participants/reject
router.post("/reject", participantController.rejectParticipant);

// POST /api/participants/complete
router.post("/complete", participantController.completeParticipant);

// POST /api/participants/join
router.post("/join", participantController.joinParticipant);

module.exports = router;
