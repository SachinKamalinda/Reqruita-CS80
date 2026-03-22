const InterviewSession = require("../../../dashboard/src/models/InterviewSession");

const STATUS_TO_RESULT = {
  positive: "Passed",
  neutral: "On Hold",
  negative: "Failed",
};

exports.submitInterviewerFeedback = async (req, res) => {
  try {
    const { meetingId, candidateId, status, feedback } = req.body || {};

    if (!meetingId || !candidateId || !status || feedback === undefined) {
      return res.status(400).json({
        error: "meetingId, candidateId, status, and feedback are required",
      });
    }

    const normalizedStatus = String(status).trim().toLowerCase();
    const mappedResult = STATUS_TO_RESULT[normalizedStatus];

    if (!mappedResult) {
      return res.status(400).json({
        error: "status must be one of: positive, neutral, negative",
      });
    }

    const normalizedMeetingId = String(meetingId).trim();
    const normalizedCandidateId = String(candidateId).trim();

    const session = await InterviewSession.findOne({
      meetingId: normalizedMeetingId,
      "candidates.candidateId": normalizedCandidateId,
    });

    if (!session) {
      return res.status(404).json({
        error: "Session or candidate not found for provided meetingId/candidateId",
      });
    }

    const slotIndex = session.candidates.findIndex(
      (candidate) => String(candidate.candidateId) === normalizedCandidateId,
    );

    if (slotIndex < 0) {
      return res.status(404).json({ error: "Candidate is not assigned to this session" });
    }

    session.candidates[slotIndex].result = mappedResult;
    session.candidates[slotIndex].notes = String(feedback || "").trim();
    session.markModified("candidates");
    await session.save();

    return res.json({
      message: "Interviewer session feedback saved",
      data: {
        meetingId: session.meetingId,
        candidateId: session.candidates[slotIndex].candidateId,
        result: session.candidates[slotIndex].result,
        notes: session.candidates[slotIndex].notes,
      },
    });
  } catch (err) {
    console.error("Failed to save interviewer feedback:", err);
    return res.status(500).json({ error: "Failed to save interviewer feedback" });
  }
};
