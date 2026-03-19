const InterviewRemark = require("../models/InterviewRemark");

exports.postRemark = async (req, res) => {
    const { interviewId, participantId, remark } = req.body;
    if (!interviewId || !participantId || remark === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        let entry = await InterviewRemark.findOne({ interviewId, participantId });
        if (entry) {
            entry.remark = remark;
            await entry.save();
        } else {
            entry = await InterviewRemark.create({ interviewId, participantId, remark });
        }
        res.json({ message: "Remark saved successfully", remark: entry });
    } catch (err) {
        console.error("Failed to save remark:", err.message);
        res.status(500).json({ error: "Failed to save remark" });
    }
};

exports.getRemark = async (req, res) => {
    try {
        const entry = await InterviewRemark.findOne({ 
            participantId: req.params.participantId 
        }).sort({ updatedAt: -1 });
        res.json(entry || { remark: "" });
    } catch (err) {
        res.status(500).json({ error: "Failed to load remark" });
    }
};
