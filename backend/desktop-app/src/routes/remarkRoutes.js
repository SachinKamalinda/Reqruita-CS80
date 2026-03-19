const express = require("express");
const router = express.Router();
const remarkController = require("../controllers/remarkController");

router.post("/", remarkController.postRemark);
router.get("/:participantId", remarkController.getRemark);

module.exports = router;
