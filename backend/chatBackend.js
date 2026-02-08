const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();
const PORT = 3002;

app.use(cors());
app.use(bodyParser.json());

console.log("CHAT BACKEND VERSION 2 RUNNING");



mongoose.connect("mongodb://127.0.0.1:27017/reqruita_chat_dummy");

mongoose.connection.once("open", () => {
  console.log("✅ Chat DB connected");
});

//Schema 
const chatSchema = new mongoose.Schema(
  {
    interviewId: String,
    sender: String,
    message: String,
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);

//  APIs 

// save chat
app.post("/api/chat/save", async (req, res) => {
  const { interviewId, sender, message } = req.body;

  if (!interviewId || !sender || !message) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const chat = await Chat.create({ interviewId, sender, message });
  res.json(chat);
});

// get chat
app.get("/api/chat/:interviewId", async (req, res) => {
  const chats = await Chat.find({
    interviewId: req.params.interviewId,
  }).sort({ createdAt: 1 });

  res.json(chats);
});

//  Start server 
app.listen(PORT, () => {
  console.log(`🚀 Chat backend running on http://localhost:${PORT}`);
});

