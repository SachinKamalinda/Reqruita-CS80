const mongoose=require("mongoose");

const chatMessageSchema = new mongoose.Schema({
      interviewId: { type: String, required: true },
      senderRole: { type: String, enum: ["interviewer", "candidate"], required: true },
      senderName: String,
      message: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
});

module.exports=mongoose.model("ChatMessage", chatMessageSchema);