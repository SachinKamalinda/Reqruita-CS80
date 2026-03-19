const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

router.get("/:interviewId", chatController.getChat);
router.delete("/:interviewId", chatController.clearChat);

module.exports = router;
