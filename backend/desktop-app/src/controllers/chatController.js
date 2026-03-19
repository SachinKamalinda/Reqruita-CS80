const ChatMessage = require("../models/ChatMessage");

exports.getChat = async (req, res) => {
    try {
        const messages = await ChatMessage.find({
            interviewId: req.params.interviewId,
        }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: "Failed to load chat" });
    }
};

exports.clearChat = async (req, res) => {
    try {
        await ChatMessage.deleteMany({ interviewId: req.params.interviewId });
        res.json({ message: "Chat history cleared" });
    } catch (err) {
        res.status(500).json({ error: "Failed to clear chat" });
    }
};
