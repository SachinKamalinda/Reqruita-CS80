const express = require("express");
const router = express.Router();
const participantController = require("../controllers/participantController");

router.get("/", participantController.getParticipants);
router.post("/allow", participantController.allowParticipant);
router.post("/join", participantController.joinParticipant);
router.post("/reject", participantController.rejectParticipant);
router.post("/complete", participantController.completeParticipant);
router.post("/leave", participantController.leaveParticipant);

module.exports = router;
