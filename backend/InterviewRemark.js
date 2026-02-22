const mogoose=require("mongoose");

const interviewRemarkSchema = new mongoose.Schema ({
    interviewId: { type: String, required: true },
    interviewerId: { type: String, required: true },
    remark: { type: String, required: true },
    rating: Number,
    createdAt: { type: Date, default: Date.now },
});

module.exports=mongoose.model("InterviewRemark", interviewRemarkSchema);