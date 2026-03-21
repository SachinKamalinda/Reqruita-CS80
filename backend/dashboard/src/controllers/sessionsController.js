const mongoose = require("mongoose");
const { Types } = mongoose;
const JobForm = require("../models/JobForm");
const FormSubmission = require("../models/FormSubmission");
const User = require("../models/User");
const InterviewSession = require("../models/InterviewSession");
const SessionEmailTemplate = require("../models/SessionEmailTemplate");
const SessionEmailLog = require("../models/SessionEmailLog");
const { sendCustomEmail } = require("../config/resend");

const SESSION_ACCESS_ROLES = new Set([
  "admin",
  "recruiter",
  "hr manager",
  "interviewer",
]);

const SESSION_INTERVIEWER_ROLES = [
  "interviewer",
  "hr manager",
  "recruiter",
  "admin",
];

const DEFAULT_EMAIL_TEMPLATES = {
  container1:
    "Dear {{interviewerName}},\n\nThis is to confirm that you have been assigned to the interview session \"{{sessionName}}\" for the {{jobTitle}} position.\n\nSession details:\n- Submission deadline: {{deadline}}\n- Interview date: {{sessionDate}}\n- Key requirements: {{requirements}}\n- Additional interviewer notes: {{remarks}}\n\nPlease review these details and prepare accordingly.\n\nBest regards,\nReqruita Interview Operations",
  container2:
    "Dear {{candidateName}},\n\nWe are pleased to inform you that you have been scheduled for \"{{sessionName}}\" as part of your application for the {{jobTitle}} role.\n\nInterview details:\n- Interviewer: {{interviewerName}}\n- Date: {{sessionDate}}\n- Expected duration: {{durationMinutes}} minutes\n\nPlease note: your exact time slot will be announced soon in a follow-up update.\n\nKind regards,\nReqruita Recruitment Team",
  container3Schedule:
    "Dear {{recipientName}},\n\nThis is an interview schedule update for \"{{sessionName}}\" ({{jobTitle}}).\n\nUpdated schedule details:\n- Action taken: {{action}}\n- Scheduled slot: {{slotTime}}\n- Duration: {{durationMinutes}} minutes\n\nPlease review this update and proceed with the next required step.\n\nBest regards,\nReqruita Interview Operations",
  container3Result:
    "Dear {{recipientName}},\n\nThis is the final outcome update for \"{{sessionName}}\" ({{jobTitle}}).\n\nInterview outcome: {{resultSummary}}\n\nThank you for your time and participation in the interview process.\n\nSincerely,\nReqruita Interview Operations",
  container3Reminder:
    "Dear {{recipientName}},\n\nThis is a professional reminder that you have an interview related to \"{{sessionName}}\" ({{jobTitle}}).\n\nInterview schedule:\n- Time slot: {{slotTime}}\n- Duration: {{durationMinutes}} minutes\n\nPlease be prepared and ensure timely participation.\n\nBest regards,\nReqruita Interview Operations",
};

const LEGACY_DEFAULT_EMAIL_TEMPLATES = {
  container1:
    "Dear {{interviewerName}},\n\nYou have been assigned to conduct {{sessionName}} for {{jobTitle}}.\nDeadline: {{deadline}}\nSession date: {{sessionDate}}\nRequirements: {{requirements}}\nRemarks: {{remarks}}\n\nRegards,\nReqruita Admin",
  container2:
    "Dear {{candidateName}},\n\nYou have been assigned to {{sessionName}} for {{jobTitle}}.\nInterviewer: {{interviewerName}}\nInterview date: {{sessionDate}}\nExpected duration: {{durationMinutes}} minutes\n\nRegards,\nReqruita Team",
  container3Schedule:
    "Dear {{recipientName}},\n\nSchedule Update for {{sessionName}} ({{jobTitle}}).\nAction: {{action}}\nSlot time: {{slotTime}}\nDuration: {{durationMinutes}} minutes\nSummary: {{resultSummary}}\n\nRegards,\nReqruita Interview Ops",
  container3Result:
    "Dear {{recipientName}},\n\nResult update for {{sessionName}} ({{jobTitle}}).\nAction: {{action}}\nSlot time: {{slotTime}}\nDuration: {{durationMinutes}} minutes\nSummary: {{resultSummary}}\n\nRegards,\nReqruita Interview Ops",
  container3Reminder:
    "Dear {{recipientName}},\n\nFriendly reminder for {{sessionName}} ({{jobTitle}}).\nAction: {{action}}\nSlot time: {{slotTime}}\nDuration: {{durationMinutes}} minutes\nSummary: {{resultSummary}}\n\nRegards,\nReqruita Interview Ops",
};

const PREVIOUS_DEFAULT_EMAIL_TEMPLATES = {
  container1:
    "Dear {{interviewerName}},\n\nThis is to confirm that you have been assigned to the interview session \"{{sessionName}}\" for the {{jobTitle}} position.\n\nSession details:\n- Submission deadline: {{deadline}}\n- Interview date: {{sessionDate}}\n- Key requirements: {{requirements}}\n- Additional interviewer notes: {{remarks}}\n\nPlease review these details and prepare accordingly.\n\nBest regards,\nReqruita Interview Operations",
  container2:
    "Dear {{candidateName}},\n\nWe are pleased to inform you that you have been scheduled for \"{{sessionName}}\" as part of your application for the {{jobTitle}} role.\n\nInterview details:\n- Interviewer: {{interviewerName}}\n- Date: {{sessionDate}}\n- Expected duration: {{durationMinutes}} minutes\n\nPlease ensure you are available at the scheduled time and join promptly.\n\nKind regards,\nReqruita Recruitment Team",
  container3Schedule:
    "Dear {{recipientName}},\n\nThis is an interview schedule update for \"{{sessionName}}\" ({{jobTitle}}).\n\nUpdate details:\n- Action taken: {{action}}\n- Scheduled slot: {{slotTime}}\n- Duration: {{durationMinutes}} minutes\n- Current summary: {{resultSummary}}\n\nPlease review this update and proceed with the next required step.\n\nBest regards,\nReqruita Interview Operations",
  container3Result:
    "Dear {{recipientName}},\n\nThis is a result update for \"{{sessionName}}\" ({{jobTitle}}).\n\nResult details:\n- Action taken: {{action}}\n- Interview slot: {{slotTime}}\n- Duration: {{durationMinutes}} minutes\n- Outcome summary: {{resultSummary}}\n\nPlease review the result and continue with the appropriate follow-up actions.\n\nSincerely,\nReqruita Interview Operations",
  container3Reminder:
    "Dear {{recipientName}},\n\nThis is a friendly reminder regarding \"{{sessionName}}\" ({{jobTitle}}).\n\nReminder details:\n- Action required: {{action}}\n- Interview slot: {{slotTime}}\n- Duration: {{durationMinutes}} minutes\n- Current summary: {{resultSummary}}\n\nPlease complete the pending action at your earliest convenience.\n\nBest regards,\nReqruita Interview Operations",
};

const CONTAINER3_TEMPLATE_KEYS = {
  schedule: "container3Schedule",
  result: "container3Result",
  reminder: "container3Reminder",
};

const EMAIL_OPTION_TO_CATEGORY = {
  schedule: "Schedule",
  result: "Result",
  reminder: "Reminder",
};

const UNKNOWN_EMAIL = "unknown@example.com";
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const RESULT_VALUES = new Set(["Pending", "Passed", "Failed", "On Hold"]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isValidObjectId = (value) => Types.ObjectId.isValid(String(value || ""));

const normalizeKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const toSafeString = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
};

const normalizeSubmissionData = (submittedData) => {
  if (!submittedData || typeof submittedData !== "object") {
    return {};
  }

  if (submittedData instanceof Map) {
    return Object.fromEntries(submittedData.entries());
  }

  return submittedData;
};

const buildSubmissionEntries = (submission) => {
  const data = normalizeSubmissionData(submission.submittedData);

  return Object.entries(data).map(([key, value]) => ({
    normalizedKey: normalizeKey(key),
    value: toSafeString(value),
  }));
};

const pickEntryByExactKey = (entries, keys) => {
  for (const key of keys) {
    const normalizedKey = normalizeKey(key);
    const match = entries.find((entry) => entry.normalizedKey === normalizedKey);
    if (match && match.value) {
      return match.value;
    }
  }

  return "";
};

const pickEntryByPartialKey = (entries, hints) => {
  for (const hint of hints) {
    const normalizedHint = normalizeKey(hint);
    const match = entries.find(
      (entry) => entry.normalizedKey.includes(normalizedHint) && entry.value,
    );
    if (match) {
      return match.value;
    }
  }

  return "";
};

const parseExperienceYears = (value) => {
  const numericValue = Number.parseInt(String(value || "").replace(/[^0-9]/g, ""), 10);
  if (Number.isNaN(numericValue)) {
    return 0;
  }
  return clamp(numericValue, 0, 50);
};

const buildFallbackNameFromEmail = (email) => {
  const normalizedEmail = toSafeString(email).toLowerCase();
  if (!normalizedEmail.includes("@")) {
    return "Applicant";
  }

  const localPart = normalizedEmail.split("@")[0] || "";
  const words = localPart
    .split(/[._-]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1));

  return words.length > 0 ? words.join(" ") : "Applicant";
};

const isValidTime = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value || "");

const formatDateInput = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatHumanDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const parseDateInput = (value, fieldName) => {
  if (!value || typeof value !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return parsed;
};

const applyEmailTemplate = (template, values) =>
  template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });

const normalizeEmailAddress = (value) => toSafeString(value).toLowerCase();

const isDeliverableEmailAddress = (value) => {
  const normalized = normalizeEmailAddress(value);
  return (
    normalized &&
    normalized !== UNKNOWN_EMAIL &&
    EMAIL_ADDRESS_PATTERN.test(normalized)
  );
};

const sendSessionEmail = async ({ to, subject, details }) => {
  const recipient = normalizeEmailAddress(to);

  if (!isDeliverableEmailAddress(recipient)) {
    return {
      sent: false,
      recipient: recipient || UNKNOWN_EMAIL,
      reason: "Recipient email is missing or invalid",
    };
  }

  const result = await sendCustomEmail({
    to: recipient,
    subject,
    text: details,
  });

  if (!result.sent) {
    return {
      sent: false,
      recipient,
      reason: result.reason || "Email provider could not send the message",
    };
  }

  return {
    sent: true,
    recipient,
  };
};

const sanitizeSessionToken = (value) =>
  String(value || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

const generateSessionMeetingId = (sessionId) =>
  `MEET-${String(sessionId || "").trim()}`;

const generateSessionMeetingPassword = (sessionId) => {
  const token = sanitizeSessionToken(sessionId);
  const suffix = token.slice(-6).padStart(6, "0");
  return `RQ${suffix}`;
};

const toObjectId = (value) => new Types.ObjectId(String(value));

const buildUserFullName = (user) => {
  const explicit = String(user.fullName || "").trim();
  if (explicit) return explicit;

  return `${String(user.firstName || "").trim()} ${String(user.lastName || "").trim()}`.trim() ||
    user.email;
};

const getInterviewerSpecialty = (user) => {
  const jobTitle = String(user.jobTitle || "").trim();
  if (jobTitle) return jobTitle;

  const roleLabel = String(user.role || "interviewer").replace(/\b\w/g, (char) =>
    char.toUpperCase(),
  );

  return roleLabel;
};

const serializeJob = (job) => ({
  id: String(job._id),
  title: job.title,
  description: String(job.description || ""),
  jobRole: String(job.jobRole || ""),
  position: job.jobRole || job.title,
  fields: (job.fields || []).map((field) => ({
    label: String(field.label || ""),
    type: String(field.type || "text"),
    required: field.required !== false,
    order: Number.isFinite(field.order) ? field.order : 0,
  })),
  applicants: Number.isFinite(job.submissionCount) ? job.submissionCount : 0,
});

const serializeInterviewer = (interviewer) => ({
  id: String(interviewer._id),
  name: buildUserFullName(interviewer),
  email: interviewer.email,
  role: String(interviewer.role || "interviewer"),
  specialty: getInterviewerSpecialty(interviewer),
});

const serializeCandidate = (submission) => {
  const entries = buildSubmissionEntries(submission);

  const firstName = pickEntryByExactKey(entries, ["firstName", "fname"]);
  const lastName = pickEntryByExactKey(entries, ["lastName", "lname"]);
  const fullName =
    pickEntryByExactKey(entries, ["fullName", "name", "candidateName", "applicantName"]) ||
    pickEntryByPartialKey(entries, ["fullname", "candidatename", "applicantname"]);

  const fallbackEmail = toSafeString(submission.submitterEmail).toLowerCase();
  const email =
    (
      pickEntryByExactKey(entries, ["email", "emailAddress"]) ||
      pickEntryByPartialKey(entries, ["email", "mail"]) ||
      fallbackEmail ||
      "unknown@example.com"
    ).toLowerCase();

  const derivedName = `${firstName} ${lastName}`.trim();
  const name = fullName || derivedName || buildFallbackNameFromEmail(email);

  const phone =
    pickEntryByExactKey(entries, ["phone", "phoneNumber", "mobile"]) ||
    pickEntryByPartialKey(entries, ["phone", "mobile", "contact"]);

  const location =
    pickEntryByExactKey(entries, ["location", "city", "country", "address"]) ||
    pickEntryByPartialKey(entries, ["location", "city", "country", "address"]);

  const portfolioUrl =
    pickEntryByExactKey(entries, ["portfolio", "portfolioUrl", "linkedin", "github", "website"]) ||
    pickEntryByPartialKey(entries, ["portfolio", "linkedin", "github", "website", "profile"]);

  const resumeFile =
    pickEntryByExactKey(entries, ["resume", "resumeFile", "cv", "attachment"]) ||
    pickEntryByPartialKey(entries, ["resume", "cv", "attachment", "file"]);

  const summary =
    pickEntryByExactKey(entries, ["summary", "coverLetter", "about", "notes", "bio"]) ||
    pickEntryByPartialKey(entries, ["summary", "cover", "about", "notes", "bio"]);

  const experienceYears = parseExperienceYears(
    pickEntryByExactKey(entries, ["experienceYears", "yearsOfExperience", "experience"]) ||
      pickEntryByPartialKey(entries, ["experienceyears", "yearsofexperience", "experience"]),
  );

  return {
    id: String(submission._id),
    jobId: String(submission.formId),
    name,
    email,
    phone,
    location,
    experienceYears,
    portfolioUrl,
    resumeFile,
    appliedDate: formatDateInput(submission.createdAt),
    summary: summary || `Application status: ${submission.status || "submitted"}`,
  };
};

const serializeSession = (session) => ({
  id: session.sessionId,
  jobId: session.jobId,
  name: session.name,
  interviewerId: session.interviewerId,
  deadline: formatDateInput(session.deadline),
  requirements: session.requirements,
  remarks: session.remarks,
  sessionDate: formatDateInput(session.sessionDate),
  startTime: session.startTime,
  durationMinutes: session.durationMinutes,
  meetingId: session.meetingId || generateSessionMeetingId(session.sessionId),
  meetingPassword:
    session.meetingPassword ||
    generateSessionMeetingPassword(session.sessionId),
  status: session.status,
  candidates: (session.candidates || []).map((candidate) => ({
    candidateId: candidate.candidateId,
    slotTime: candidate.slotTime || "",
    durationMinutes: candidate.durationMinutes,
    result: candidate.result,
    notes: candidate.notes || "",
  })),
  lastEmailAt: session.lastEmailAt ? new Date(session.lastEmailAt).toLocaleString() : null,
});

const serializeEmailLog = (log) => ({
  id: String(log._id),
  sentAt: new Date(log.sentAt).toLocaleString(),
  category: log.category,
  recipient: log.recipient,
  subject: log.subject,
  details: log.details,
});

const getSessionBreakdown = (session) =>
  (session.candidates || []).reduce(
    (counts, candidate) => {
      if (candidate.result === "Passed") counts.passed += 1;
      else if (candidate.result === "Failed") counts.failed += 1;
      else if (candidate.result === "On Hold") counts.onHold += 1;
      else counts.pending += 1;

      return counts;
    },
    { pending: 0, passed: 0, failed: 0, onHold: 0 },
  );

const hasSessionPermission = (req, res) => {
  if (!req.user || !SESSION_ACCESS_ROLES.has(req.user.role)) {
    res.status(403).json({
      message:
        "Access Denied: Requires admin, recruiter, hr manager, or interviewer role",
    });
    return false;
  }

  return true;
};

const buildTemplateMap = async () => {
  const templates = await SessionEmailTemplate.find({}).lean();
  const map = { ...DEFAULT_EMAIL_TEMPLATES };

  templates.forEach((template) => {
    map[template.templateKey] = template.content;
  });

  return map;
};

const appendEmailLogs = async (entries) => {
  if (!entries || entries.length === 0) return [];

  const now = new Date();
  const created = await SessionEmailLog.insertMany(
    entries.map((entry) => ({
      sentAt: now,
      category: entry.category,
      recipient: entry.recipient,
      subject: entry.subject,
      details: entry.details,
      metadata: entry.metadata || {},
    })),
  );

  const stale = await SessionEmailLog.find({})
    .sort({ sentAt: -1 })
    .skip(250)
    .select("_id")
    .lean();

  if (stale.length > 0) {
    await SessionEmailLog.deleteMany({ _id: { $in: stale.map((item) => item._id) } });
  }

  return created;
};

let hasSeededSessionData = false;
let seedInFlight = null;

const ensureSessionSeedData = async () => {
  if (hasSeededSessionData) return;
  if (seedInFlight) {
    await seedInFlight;
    return;
  }

  seedInFlight = (async () => {
    const connection = mongoose.connection;
    if (connection && connection.db) {
      const legacyCollections = [
        "sessionjobforms",
        "sessioncandidates",
        "sessioninterviewers",
      ];

      await Promise.all(
        legacyCollections.map(async (collectionName) => {
          const exists = await connection.db
            .listCollections({ name: collectionName })
            .hasNext();

          if (!exists) return;

          try {
            await connection.db.collection(collectionName).drop();
          } catch (dropError) {
            if (dropError.codeName !== "NamespaceNotFound") return;
          }
        }),
      );
    }

    await InterviewSession.deleteMany({
      jobId: { $not: /^[a-fA-F0-9]{24}$/ },
    });

    await InterviewSession.updateMany(
      {},
      {
        $pull: {
          candidates: { candidateId: { $not: /^[a-fA-F0-9]{24}$/ } },
        },
      },
    );

    const templateCount = await SessionEmailTemplate.countDocuments();
    if (templateCount === 0) {
      const templateRows = Object.entries(DEFAULT_EMAIL_TEMPLATES).map(
        ([templateKey, content]) => ({
          templateKey,
          content,
        }),
      );
      await SessionEmailTemplate.insertMany(templateRows);
    } else {
      await Promise.all(
        Object.keys(DEFAULT_EMAIL_TEMPLATES).map(async (templateKey) => {
          const updatableContents = [
            LEGACY_DEFAULT_EMAIL_TEMPLATES[templateKey],
            PREVIOUS_DEFAULT_EMAIL_TEMPLATES[templateKey],
          ].filter(Boolean);

          if (updatableContents.length === 0) {
            return;
          }

            await SessionEmailTemplate.updateOne(
              { templateKey, content: { $in: updatableContents } },
              { $set: { content: DEFAULT_EMAIL_TEMPLATES[templateKey] } },
            );
        }),
      );
    }

    hasSeededSessionData = true;
  })();

  try {
    await seedInFlight;
  } finally {
    seedInFlight = null;
  }
};

const fetchScopedJobForms = async (userId, requestedJobId = "") => {
  const filter = { createdBy: userId };

  if (requestedJobId) {
    if (!isValidObjectId(requestedJobId)) {
      return [];
    }
    filter._id = requestedJobId;
  }

  return JobForm.find(filter).sort({ createdAt: -1 }).lean();
};

const buildInterviewerFilter = (reqUser) => {
  const filter = {
    role: { $in: SESSION_INTERVIEWER_ROLES },
    status: "active",
  };

  if (!isValidObjectId(reqUser.companyId)) {
    filter._id = { $exists: false };
    return filter;
  }

  filter.companyId = toObjectId(reqUser.companyId);

  return filter;
};

const fetchScopedInterviewers = async (reqUser) =>
  User.find(buildInterviewerFilter(reqUser))
    .select("firstName lastName fullName email role jobTitle companyId status")
    .sort({ firstName: 1, lastName: 1, email: 1 })
    .lean();

const fetchScopedInterviewerById = async (reqUser, interviewerId) => {
  if (!isValidObjectId(interviewerId)) {
    return null;
  }

  return User.findOne({
    ...buildInterviewerFilter(reqUser),
    _id: toObjectId(interviewerId),
  })
    .select("firstName lastName fullName email role jobTitle companyId status")
    .lean();
};

const fetchScopedSubmissions = async (formIds) => {
  if (!formIds || formIds.length === 0) {
    return [];
  }

  return FormSubmission.find({ formId: { $in: formIds } })
    .sort({ createdAt: 1, _id: 1 })
    .lean();
};

const fetchScopedSessions = async (formIds) => {
  if (!formIds || formIds.length === 0) {
    return [];
  }

  return InterviewSession.find({ jobId: { $in: formIds } })
    .sort({ sessionDate: 1, sessionId: 1 })
    .lean();
};

const fetchAssignedSessionsForInterviewer = async (userId, requestedJobId = "") => {
  const filter = { interviewerId: String(userId || "") };

  if (requestedJobId) {
    if (!isValidObjectId(requestedJobId)) {
      return [];
    }
    filter.jobId = requestedJobId;
  }

  return InterviewSession.find(filter)
    .sort({ sessionDate: 1, sessionId: 1 })
    .lean();
};

const fetchOwnedJobForSession = async (userId, session) => {
  if (!session || !isValidObjectId(session.jobId)) {
    return null;
  }

  return JobForm.findOne({
    _id: session.jobId,
    createdBy: userId,
  }).lean();
};

const fetchCandidateSubmission = async (candidateId) => {
  if (!isValidObjectId(candidateId)) {
    return null;
  }

  return FormSubmission.findById(candidateId).lean();
};

const fetchCandidateSubmissionsByIds = async (candidateIds) => {
  const objectIds = (candidateIds || [])
    .filter((candidateId) => isValidObjectId(candidateId))
    .map((candidateId) => toObjectId(candidateId));

  if (objectIds.length === 0) {
    return [];
  }

  return FormSubmission.find({ _id: { $in: objectIds } }).lean();
};

const fetchSessionById = async (sessionId) =>
  InterviewSession.findOne({ sessionId });

exports.getBootstrap = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const requestedJobId = String(req.query.jobId || "").trim();
    const userId = req.user.id;

    if (req.user.role === "interviewer") {
      const sessions = await fetchAssignedSessionsForInterviewer(
        userId,
        requestedJobId,
      );

      const scopedJobIds = [...new Set(sessions.map((session) => String(session.jobId)))];
      const jobs =
        scopedJobIds.length > 0
          ? await JobForm.find({ _id: { $in: scopedJobIds } })
              .sort({ createdAt: -1 })
              .lean()
          : [];

      const [interviewers, candidates, templates, emailLogs] = await Promise.all([
        fetchScopedInterviewers(req.user),
        fetchScopedSubmissions(scopedJobIds),
        buildTemplateMap(),
        SessionEmailLog.find({}).sort({ sentAt: -1 }).limit(250).lean(),
      ]);

      return res.json({
        jobs: jobs.map(serializeJob),
        interviewers: interviewers.map(serializeInterviewer),
        candidates: candidates.map(serializeCandidate),
        sessions: sessions.map(serializeSession),
        emailTemplates: templates,
        emailLogs: emailLogs.map(serializeEmailLog),
      });
    }

    const jobs = await fetchScopedJobForms(userId, requestedJobId);
    const jobIds = jobs.map((job) => String(job._id));

    const [interviewers, sessions, candidates, templates, emailLogs] = await Promise.all([
      fetchScopedInterviewers(req.user),
      fetchScopedSessions(jobIds),
      fetchScopedSubmissions(jobIds),
      buildTemplateMap(),
      SessionEmailLog.find({}).sort({ sentAt: -1 }).limit(250).lean(),
    ]);

    res.json({
      jobs: jobs.map(serializeJob),
      interviewers: interviewers.map(serializeInterviewer),
      candidates: candidates.map(serializeCandidate),
      sessions: sessions.map(serializeSession),
      emailTemplates: templates,
      emailLogs: emailLogs.map(serializeEmailLog),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getJobs = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();
    const jobs = await fetchScopedJobForms(req.user.id);
    res.json(jobs.map(serializeJob));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getInterviewers = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();
    const interviewers = await fetchScopedInterviewers(req.user);
    res.json(interviewers.map(serializeInterviewer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCandidates = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const requestedJobId = String(req.query.jobId || "").trim();
    const jobs = await fetchScopedJobForms(req.user.id, requestedJobId);
    const jobIds = jobs.map((job) => String(job._id));

    const candidates = await fetchScopedSubmissions(jobIds);
    res.json(candidates.map(serializeCandidate));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listSessions = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const requestedJobId = String(req.query.jobId || "").trim();
    const jobs = await fetchScopedJobForms(req.user.id, requestedJobId);
    const jobIds = jobs.map((job) => String(job._id));
    const sessions = await fetchScopedSessions(jobIds);

    res.json(sessions.map(serializeSession));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSessionById = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const sessionId = String(req.params.sessionId || "").trim();
    const session = await InterviewSession.findOne({ sessionId }).lean();

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const ownedJob = await fetchOwnedJobForSession(req.user.id, session);
    if (!ownedJob) {
      return res.status(404).json({ message: "Session not found" });
    }

    return res.json(serializeSession(session));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getEmailTemplates = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();
    const templateMap = await buildTemplateMap();
    res.json(templateMap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateEmailTemplate = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const templateKey = String(req.params.templateKey || "").trim();
    const content = String(req.body.content || "");
    const normalizedContent = content.trim();

    if (!Object.prototype.hasOwnProperty.call(DEFAULT_EMAIL_TEMPLATES, templateKey)) {
      return res.status(400).json({ message: "Invalid template key" });
    }

    if (!normalizedContent) {
      return res.status(400).json({ message: "Template content cannot be empty" });
    }

    const existingTemplate = await SessionEmailTemplate.findOne({ templateKey }).lean();
    if (existingTemplate && existingTemplate.content === normalizedContent) {
      const templateMap = await buildTemplateMap();
      return res.json({
        message: `No changes detected for ${templateKey}.`,
        emailTemplates: templateMap,
        hasChanges: false,
      });
    }

    await SessionEmailTemplate.findOneAndUpdate(
      { templateKey },
      { content: normalizedContent },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    const templateMap = await buildTemplateMap();
    return res.json({
      message: `Automated email template saved for ${templateKey}.`,
      emailTemplates: templateMap,
      hasChanges: true,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getEmailLogs = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const requestedLimit = Number.parseInt(String(req.query.limit || "250"), 10);
    const limit = Number.isNaN(requestedLimit)
      ? 250
      : clamp(requestedLimit, 1, 500);

    const logs = await SessionEmailLog.find({})
      .sort({ sentAt: -1 })
      .limit(limit)
      .lean();

    res.json(logs.map(serializeEmailLog));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSession = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const {
      jobId,
      sessionName,
      interviewerId,
      deadline,
      sessionDate,
      startTime,
      durationMinutes,
      requirements,
      remarks,
    } = req.body || {};

    if (!jobId || !interviewerId || !deadline || !sessionDate) {
      return res.status(400).json({
        message: "jobId, interviewerId, deadline, and sessionDate are required",
      });
    }

    const normalizedJobId = String(jobId).trim();
    if (!isValidObjectId(normalizedJobId)) {
      return res.status(400).json({ message: "jobId is invalid" });
    }

    if (!requirements || !String(requirements).trim()) {
      return res.status(400).json({
        message: "Requirements are required for session creation",
      });
    }

    if (!remarks || !String(remarks).trim()) {
      return res.status(400).json({
        message: "Remarks are required for session creation",
      });
    }

    const normalizedStartTime = String(startTime || "09:00").trim();
    if (!isValidTime(normalizedStartTime)) {
      return res.status(400).json({ message: "startTime must be in HH:mm format" });
    }

    let deadlineDate;
    let sessionDateValue;
    try {
      deadlineDate = parseDateInput(String(deadline), "deadline");
      sessionDateValue = parseDateInput(String(sessionDate), "sessionDate");
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    const duration = clamp(Number.parseInt(String(durationMinutes || "30"), 10) || 30, 10, 120);

    const [job, interviewer, existingSessions] = await Promise.all([
      JobForm.findOne({ _id: normalizedJobId, createdBy: req.user.id }).lean(),
      fetchScopedInterviewerById(req.user, String(interviewerId).trim()),
      InterviewSession.find({ jobId: normalizedJobId }).select("sessionId").lean(),
    ]);

    if (!job) {
      return res.status(404).json({ message: "Selected job form was not found" });
    }

    if (!interviewer) {
      return res.status(404).json({ message: "Selected interviewer was not found" });
    }

    let maxSessionNumber = 0;
    existingSessions.forEach((session) => {
      const match = String(session.sessionId).match(/-S(\d+)$/);
      if (!match) return;

      const parsed = Number.parseInt(match[1], 10);
      if (!Number.isNaN(parsed)) {
        maxSessionNumber = Math.max(maxSessionNumber, parsed);
      }
    });

    const nextSessionNumber = maxSessionNumber + 1;
    const generatedSessionId =
      `JOB-${String(job._id).slice(-6).toUpperCase()}-S${String(nextSessionNumber).padStart(2, "0")}`;
    const generatedSessionName =
      String(sessionName || "").trim() || `Session ${nextSessionNumber}`;

    const createdSession = await InterviewSession.create({
      sessionId: generatedSessionId,
      jobId: String(job._id),
      name: generatedSessionName,
      interviewerId: String(interviewer._id),
      deadline: deadlineDate,
      requirements: String(requirements).trim(),
      remarks: String(remarks).trim(),
      sessionDate: sessionDateValue,
      startTime: normalizedStartTime,
      durationMinutes: duration,
      meetingId: generateSessionMeetingId(generatedSessionId),
      meetingPassword: generateSessionMeetingPassword(generatedSessionId),
      status: "Draft",
      candidates: [],
      lastEmailAt: new Date(),
    });

    const emailTemplates = await buildTemplateMap();
    const sessionEmailMessage = applyEmailTemplate(emailTemplates.container1, {
      interviewerName: buildUserFullName(interviewer),
      sessionName: generatedSessionName,
      jobTitle: job.title,
      deadline: formatHumanDate(deadlineDate),
      sessionDate: formatHumanDate(sessionDateValue),
      requirements: String(requirements).trim(),
      remarks: String(remarks).trim(),
    });

    const sessionEmailSubject = `${generatedSessionName} created for ${job.title}`;
    const sessionEmailResult = await sendSessionEmail({
      to: interviewer.email,
      subject: sessionEmailSubject,
      details: sessionEmailMessage,
    });

    await appendEmailLogs([
      {
        category: "Session",
        recipient: sessionEmailResult.recipient,
        subject: sessionEmailSubject,
        details: sessionEmailMessage,
        metadata: {
          sessionId: generatedSessionId,
          jobId: String(job._id),
          deliveryStatus: sessionEmailResult.sent ? "sent" : "failed",
          ...(sessionEmailResult.sent
            ? {}
            : { deliveryReason: sessionEmailResult.reason }),
        },
      },
    ]);

    const message = sessionEmailResult.sent
      ? `${generatedSessionName} created and session email sent for ${job.title}.`
      : `${generatedSessionName} created for ${job.title}, but session email could not be sent (${sessionEmailResult.reason}).`;

    return res.status(201).json({
      message,
      session: serializeSession(createdSession.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.assignCandidate = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const candidateId = String(req.body.candidateId || "").trim();
    const targetSessionId = String(req.body.targetSessionId || "").trim();

    if (!candidateId || !targetSessionId) {
      return res
        .status(400)
        .json({ message: "candidateId and targetSessionId are required" });
    }

    const [candidateSubmission, targetSession] = await Promise.all([
      fetchCandidateSubmission(candidateId),
      InterviewSession.findOne({ sessionId: targetSessionId }),
    ]);

    const candidate = candidateSubmission ? serializeCandidate(candidateSubmission) : null;

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!targetSession) {
      return res.status(404).json({ message: "Target session not found" });
    }

    const targetJob = await fetchOwnedJobForSession(req.user.id, targetSession);
    if (!targetJob) {
      return res.status(404).json({ message: "Target session job form was not found" });
    }

    if (String(targetSession.jobId) !== String(candidateSubmission.formId)) {
      return res.status(400).json({
        message: "Candidate can only be assigned to sessions under the same job form",
      });
    }

    const previouslyAssignedSession = await InterviewSession.findOne({
      jobId: String(candidateSubmission.formId),
      "candidates.candidateId": candidateId,
    })
      .select("sessionId name")
      .lean();

    await InterviewSession.updateMany(
      { jobId: String(candidateSubmission.formId) },
      { $pull: { candidates: { candidateId } } },
    );

    const refreshedTargetSession = await fetchSessionById(targetSessionId);
    if (!refreshedTargetSession) {
      return res.status(404).json({ message: "Target session no longer exists" });
    }

    refreshedTargetSession.candidates.push({
      candidateId,
      slotTime: "",
      durationMinutes: refreshedTargetSession.durationMinutes,
      result: "Pending",
      notes: "",
    });
    refreshedTargetSession.lastEmailAt = new Date();
    await refreshedTargetSession.save();

    const [interviewer, job, emailTemplates] = await Promise.all([
      fetchScopedInterviewerById(req.user, refreshedTargetSession.interviewerId),
      JobForm.findById(refreshedTargetSession.jobId).lean(),
      buildTemplateMap(),
    ]);

    const assignmentMessage = applyEmailTemplate(emailTemplates.container2, {
      candidateName: candidate.name,
      sessionName: refreshedTargetSession.name,
      jobTitle: job ? job.title : targetJob.title,
      interviewerName: interviewer ? buildUserFullName(interviewer) : "Interviewer",
      sessionDate: formatHumanDate(refreshedTargetSession.sessionDate),
      durationMinutes: refreshedTargetSession.durationMinutes,
    });

    const assignmentSubject = `Interview assigned: ${refreshedTargetSession.name}`;
    const assignmentEmailResult = await sendSessionEmail({
      to: candidate.email,
      subject: assignmentSubject,
      details: assignmentMessage,
    });

    await appendEmailLogs([
      {
        category: "Assignment",
        recipient: assignmentEmailResult.recipient,
        subject: assignmentSubject,
        details: assignmentMessage,
        metadata: {
          sessionId: refreshedTargetSession.sessionId,
          candidateId,
          deliveryStatus: assignmentEmailResult.sent ? "sent" : "failed",
          ...(assignmentEmailResult.sent
            ? {}
            : { deliveryReason: assignmentEmailResult.reason }),
        },
      },
    ]);

    const assignmentSummary = previouslyAssignedSession
      ? `${candidate.name} moved from ${previouslyAssignedSession.name} to ${refreshedTargetSession.name}.`
      : `${candidate.name} assigned to ${refreshedTargetSession.name}.`;

    const message = assignmentEmailResult.sent
      ? `${assignmentSummary} Assignment email sent.`
      : `${assignmentSummary} Assignment email could not be sent (${assignmentEmailResult.reason}).`;

    return res.json({
      message,
      session: serializeSession(refreshedTargetSession.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.sendAssignmentEmailToCandidate = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const candidateId = String(req.body.candidateId || "").trim();
    if (!candidateId) {
      return res.status(400).json({ message: "candidateId is required" });
    }

    const [candidateSubmission, session] = await Promise.all([
      fetchCandidateSubmission(candidateId),
      InterviewSession.findOne({ "candidates.candidateId": candidateId }),
    ]);

    const candidate = candidateSubmission ? serializeCandidate(candidateSubmission) : null;

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!session) {
      return res.status(400).json({
        message: "Candidate must be assigned to a session before sending assignment email",
      });
    }

    const [interviewer, job, emailTemplates] = await Promise.all([
      fetchScopedInterviewerById(req.user, session.interviewerId),
      fetchOwnedJobForSession(req.user.id, session),
      buildTemplateMap(),
    ]);

    if (!job) {
      return res.status(404).json({ message: "Session job form was not found" });
    }

    if (String(candidate.jobId) !== String(session.jobId)) {
      return res.status(400).json({
        message: "Candidate does not belong to this session's job form",
      });
    }

    const assignmentMessage = applyEmailTemplate(emailTemplates.container2, {
      candidateName: candidate.name,
      sessionName: session.name,
      jobTitle: job.title,
      interviewerName: interviewer ? buildUserFullName(interviewer) : "Interviewer",
      sessionDate: formatHumanDate(session.sessionDate),
      durationMinutes: session.durationMinutes,
    });

    const assignmentSubject = `Assignment update: ${session.name}`;
    const assignmentEmailResult = await sendSessionEmail({
      to: candidate.email,
      subject: assignmentSubject,
      details: assignmentMessage,
    });

    const emailLogs = await appendEmailLogs([
      {
        category: "Assignment",
        recipient: assignmentEmailResult.recipient,
        subject: assignmentSubject,
        details: assignmentMessage,
        metadata: {
          sessionId: session.sessionId,
          candidateId,
          deliveryStatus: assignmentEmailResult.sent ? "sent" : "failed",
          ...(assignmentEmailResult.sent
            ? {}
            : { deliveryReason: assignmentEmailResult.reason }),
        },
      },
    ]);

    if (!assignmentEmailResult.sent) {
      const statusCode = assignmentEmailResult.reason === "Recipient email is missing or invalid"
        ? 400
        : 502;

      return res.status(statusCode).json({
        message: `Assignment email could not be sent (${assignmentEmailResult.reason}).`,
        emailLog: emailLogs[0] ? serializeEmailLog(emailLogs[0].toObject()) : null,
      });
    }

    session.lastEmailAt = new Date();
    await session.save();

    return res.json({
      message: `Assignment email sent to ${candidate.name}.`,
      session: serializeSession(session.toObject()),
      emailLog: emailLogs[0] ? serializeEmailLog(emailLogs[0].toObject()) : null,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.updateSessionCandidateDetails = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const sessionId = String(req.params.sessionId || "").trim();
    const candidateId = String(req.params.candidateId || "").trim();

    const { slotTime, durationMinutes, result, notes } = req.body || {};

    if (
      slotTime === undefined &&
      durationMinutes === undefined &&
      result === undefined &&
      notes === undefined
    ) {
      return res.status(400).json({
        message: "Provide at least one of slotTime, durationMinutes, result, or notes",
      });
    }

    const session = await fetchSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const ownedJob = await fetchOwnedJobForSession(req.user.id, session);
    if (!ownedJob) {
      return res.status(404).json({ message: "Session not found" });
    }

    const slotIndex = session.candidates.findIndex(
      (candidate) => candidate.candidateId === candidateId,
    );

    if (slotIndex < 0) {
      return res.status(404).json({ message: "Candidate is not assigned to this session" });
    }

    if (slotTime !== undefined) {
      const normalizedSlotTime = String(slotTime || "").trim();
      if (normalizedSlotTime && !isValidTime(normalizedSlotTime)) {
        return res.status(400).json({ message: "slotTime must be in HH:mm format" });
      }
      session.candidates[slotIndex].slotTime = normalizedSlotTime;
    }

    if (durationMinutes !== undefined) {
      const parsedDuration = Number.parseInt(String(durationMinutes), 10);
      if (Number.isNaN(parsedDuration)) {
        return res.status(400).json({ message: "durationMinutes must be a number" });
      }
      session.candidates[slotIndex].durationMinutes = clamp(parsedDuration, 10, 120);
    }

    if (result !== undefined) {
      const normalizedResult = String(result).trim();
      if (!RESULT_VALUES.has(normalizedResult)) {
        return res.status(400).json({ message: "Invalid result value" });
      }
      session.candidates[slotIndex].result = normalizedResult;
    }

    if (notes !== undefined) {
      session.candidates[slotIndex].notes = String(notes || "").trim();
    }

    await session.save();

    return res.json({
      message: "Candidate interview details updated.",
      session: serializeSession(session.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.conductSession = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const sessionId = String(req.params.sessionId || "").trim();
    const session = await fetchSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const ownedJob = await fetchOwnedJobForSession(req.user.id, session);
    if (!ownedJob) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.status !== "Completed") {
      session.status = "Scheduled";
    }

    session.lastEmailAt = new Date();
    await session.save();

    return res.json({
      message: `Session started for ${session.name}.`,
      session: serializeSession(session.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.sendScheduleEmails = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const sessionId = String(req.params.sessionId || "").trim();
    const session = await fetchSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const ownedJob = await fetchOwnedJobForSession(req.user.id, session);
    if (!ownedJob) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (!session.candidates || session.candidates.length === 0) {
      return res.status(400).json({
        message: "No candidates in this session yet. Assign candidates before sending schedule emails.",
      });
    }

    const [interviewer, emailTemplates] = await Promise.all([
      fetchScopedInterviewerById(req.user, session.interviewerId),
      buildTemplateMap(),
    ]);

    const candidateSubmissions = await fetchCandidateSubmissionsByIds(
      (session.candidates || []).map((candidate) => candidate.candidateId),
    );
    const candidateById = new Map(
      candidateSubmissions.map((submission) => {
        const serialized = serializeCandidate(submission);
        return [serialized.id, serialized];
      }),
    );

    const scheduleForInterviewer = applyEmailTemplate(
      emailTemplates.container3Schedule,
      {
        recipientName: interviewer ? buildUserFullName(interviewer) : "Interviewer",
        sessionName: session.name,
        jobTitle: ownedJob.title,
        action: "Schedule confirmed",
        slotTime: session.startTime,
        durationMinutes: session.durationMinutes,
        resultSummary: `${session.candidates.length} candidates notified`,
      },
    );

    const interviewerSubject = `${session.name} schedule confirmed`;
    const interviewerEmailResult = await sendSessionEmail({
      to: interviewer ? interviewer.email : "",
      subject: interviewerSubject,
      details: scheduleForInterviewer,
    });

    const candidateEmailResults = await Promise.all(
      (session.candidates || []).map(async (slot) => {
        const candidate = candidateById.get(slot.candidateId);
        if (!candidate) {
          return {
            candidateId: slot.candidateId,
            recipient: UNKNOWN_EMAIL,
            subject: `${session.name} slot schedule`,
            details: "Candidate record could not be resolved for email delivery.",
            sent: false,
            reason: "Candidate record not found",
          };
        }

        const details = applyEmailTemplate(emailTemplates.container3Schedule, {
          recipientName: candidate.name,
          sessionName: session.name,
          jobTitle: ownedJob.title,
          action: "Interview schedule",
          slotTime: slot.slotTime || session.startTime,
          durationMinutes: slot.durationMinutes || session.durationMinutes,
          resultSummary: "Please be ready before your assigned slot.",
        });

        const subject = `${session.name} slot schedule`;
        const delivery = await sendSessionEmail({
          to: candidate.email,
          subject,
          details,
        });

        return {
          candidateId: slot.candidateId,
          recipient: delivery.recipient,
          subject,
          details,
          sent: delivery.sent,
          reason: delivery.reason,
        };
      }),
    );

    const emailLogs = await appendEmailLogs([
      {
        category: "Schedule",
        recipient: interviewerEmailResult.recipient,
        subject: interviewerSubject,
        details: scheduleForInterviewer,
        metadata: {
          sessionId: session.sessionId,
          deliveryStatus: interviewerEmailResult.sent ? "sent" : "failed",
          ...(interviewerEmailResult.sent
            ? {}
            : { deliveryReason: interviewerEmailResult.reason }),
        },
      },
      ...candidateEmailResults.map((result) => ({
        category: "Schedule",
        recipient: result.recipient,
        subject: result.subject,
        details: result.details,
        metadata: {
          sessionId: session.sessionId,
          candidateId: result.candidateId,
          deliveryStatus: result.sent ? "sent" : "failed",
          ...(result.sent ? {} : { deliveryReason: result.reason }),
        },
      })),
    ]);

    const sentCount =
      (interviewerEmailResult.sent ? 1 : 0) +
      candidateEmailResults.filter((result) => result.sent).length;
    const totalCount = 1 + candidateEmailResults.length;
    const failedCount = totalCount - sentCount;

    if (session.status !== "Completed") {
      session.status = "Scheduled";
    }
    session.lastEmailAt = new Date();
    await session.save();

    return res.json({
      message:
        failedCount === 0
          ? `Schedule emails sent for ${session.name}. Session marked as Scheduled.`
          : `Schedule emails processed for ${session.name}. Sent ${sentCount}/${totalCount}; ${failedCount} failed.`,
      session: serializeSession(session.toObject()),
      emailLogs: emailLogs.map((item) => serializeEmailLog(item.toObject())),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.sendResultEmails = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const sessionId = String(req.params.sessionId || "").trim();
    const session = await fetchSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const ownedJob = await fetchOwnedJobForSession(req.user.id, session);
    if (!ownedJob) {
      return res.status(404).json({ message: "Session not found" });
    }

    const breakdown = getSessionBreakdown(session);
    const reviewed = breakdown.passed + breakdown.failed + breakdown.onHold;

    if (reviewed === 0) {
      return res.status(400).json({
        message: "Set candidate results before sending outcome emails from container 3.",
      });
    }

    const [interviewer, emailTemplates] = await Promise.all([
      fetchScopedInterviewerById(req.user, session.interviewerId),
      buildTemplateMap(),
    ]);

    const reviewedSlots = (session.candidates || []).filter(
      (candidate) => candidate.result !== "Pending",
    );

    const reviewedSubmissions = await fetchCandidateSubmissionsByIds(
      reviewedSlots.map((candidate) => candidate.candidateId),
    );
    const candidateById = new Map(
      reviewedSubmissions.map((submission) => {
        const serialized = serializeCandidate(submission);
        return [serialized.id, serialized];
      }),
    );

    const resultSummary = `${breakdown.passed} passed, ${breakdown.failed} failed, ${breakdown.onHold} on hold, ${breakdown.pending} pending`;

    const resultForInterviewer = applyEmailTemplate(
      emailTemplates.container3Result,
      {
        recipientName: interviewer ? buildUserFullName(interviewer) : "Interviewer",
        sessionName: session.name,
        jobTitle: ownedJob.title,
        action: "Result publication",
        slotTime: session.startTime,
        durationMinutes: session.durationMinutes,
        resultSummary,
      },
    );

    const interviewerSubject = `${session.name} result summary`;
    const interviewerEmailResult = await sendSessionEmail({
      to: interviewer ? interviewer.email : "",
      subject: interviewerSubject,
      details: resultForInterviewer,
    });

    const candidateEmailResults = await Promise.all(
      reviewedSlots.map(async (slot) => {
        const candidate = candidateById.get(slot.candidateId);
        if (!candidate) {
          return {
            candidateId: slot.candidateId,
            recipient: UNKNOWN_EMAIL,
            subject: `${session.name} interview outcome`,
            details: "Candidate record could not be resolved for result email delivery.",
            sent: false,
            reason: "Candidate record not found",
          };
        }

        const details = applyEmailTemplate(emailTemplates.container3Result, {
          recipientName: candidate.name,
          sessionName: session.name,
          jobTitle: ownedJob.title,
          action: "Result notification",
          slotTime: slot.slotTime || session.startTime,
          durationMinutes: slot.durationMinutes || session.durationMinutes,
          resultSummary: slot.result,
        });

        const subject = `${session.name} interview outcome`;
        const delivery = await sendSessionEmail({
          to: candidate.email,
          subject,
          details,
        });

        return {
          candidateId: slot.candidateId,
          recipient: delivery.recipient,
          subject,
          details,
          sent: delivery.sent,
          reason: delivery.reason,
        };
      }),
    );

    const emailLogs = await appendEmailLogs([
      {
        category: "Result",
        recipient: interviewerEmailResult.recipient,
        subject: interviewerSubject,
        details: resultForInterviewer,
        metadata: {
          sessionId: session.sessionId,
          reviewed,
          deliveryStatus: interviewerEmailResult.sent ? "sent" : "failed",
          ...(interviewerEmailResult.sent
            ? {}
            : { deliveryReason: interviewerEmailResult.reason }),
        },
      },
      ...candidateEmailResults.map((result) => ({
        category: "Result",
        recipient: result.recipient,
        subject: result.subject,
        details: result.details,
        metadata: {
          sessionId: session.sessionId,
          reviewed,
          candidateId: result.candidateId,
          deliveryStatus: result.sent ? "sent" : "failed",
          ...(result.sent ? {} : { deliveryReason: result.reason }),
        },
      })),
    ]);

    const sentCount =
      (interviewerEmailResult.sent ? 1 : 0) +
      candidateEmailResults.filter((result) => result.sent).length;
    const totalCount = 1 + candidateEmailResults.length;
    const failedCount = totalCount - sentCount;

    if (breakdown.pending === 0) {
      session.status = "Completed";
    }

    session.lastEmailAt = new Date();
    await session.save();

    return res.json({
      message:
        failedCount === 0
          ? `Result emails sent for ${session.name}. Reviewed candidates: ${reviewed}.`
          : `Result emails processed for ${session.name}. Sent ${sentCount}/${totalCount}; ${failedCount} failed.`,
      session: serializeSession(session.toObject()),
      breakdown,
      emailLogs: emailLogs.map((item) => serializeEmailLog(item.toObject())),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.sendCandidateEmail = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const sessionId = String(req.params.sessionId || "").trim();
    const candidateId = String(req.body.candidateId || "").trim();
    const emailOption = String(req.body.emailOption || "reminder").trim().toLowerCase();

    if (!candidateId) {
      return res.status(400).json({ message: "candidateId is required" });
    }

    if (!Object.prototype.hasOwnProperty.call(CONTAINER3_TEMPLATE_KEYS, emailOption)) {
      return res.status(400).json({
        message: "emailOption must be one of: schedule, result, reminder",
      });
    }

    const session = await fetchSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const ownedJob = await fetchOwnedJobForSession(req.user.id, session);
    if (!ownedJob) {
      return res.status(404).json({ message: "Session not found" });
    }

    const slot = (session.candidates || []).find(
      (candidate) => candidate.candidateId === candidateId,
    );
    if (!slot) {
      return res.status(404).json({ message: "Candidate is not assigned to this session" });
    }

    const [candidateSubmission, emailTemplates] = await Promise.all([
      fetchCandidateSubmission(candidateId),
      buildTemplateMap(),
    ]);

    const candidate = candidateSubmission ? serializeCandidate(candidateSubmission) : null;

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (String(candidate.jobId) !== String(session.jobId)) {
      return res.status(400).json({
        message: "Candidate does not belong to this session's job form",
      });
    }

    const templateKey = CONTAINER3_TEMPLATE_KEYS[emailOption];
    const template = emailTemplates[templateKey] || DEFAULT_EMAIL_TEMPLATES[templateKey];

    let subject = `Reminder: ${session.name}`;
    let action = "Reminder";

    if (emailOption === "schedule") {
      subject = `Schedule: ${session.name}`;
      action = "Schedule";
    } else if (emailOption === "result") {
      subject = `Result Update: ${session.name}`;
      action = "Result update";
    }

    const details = applyEmailTemplate(template, {
      recipientName: candidate.name,
      sessionName: session.name,
      jobTitle: ownedJob.title,
      action,
      slotTime: slot.slotTime || session.startTime,
      durationMinutes: slot.durationMinutes,
      resultSummary: slot.result,
    });

    const delivery = await sendSessionEmail({
      to: candidate.email,
      subject,
      details,
    });

    const emailLog = await appendEmailLogs([
      {
        category: EMAIL_OPTION_TO_CATEGORY[emailOption],
        recipient: delivery.recipient,
        subject,
        details,
        metadata: {
          sessionId: session.sessionId,
          candidateId,
          deliveryStatus: delivery.sent ? "sent" : "failed",
          ...(delivery.sent ? {} : { deliveryReason: delivery.reason }),
        },
      },
    ]);

    if (!delivery.sent) {
      const statusCode = delivery.reason === "Recipient email is missing or invalid"
        ? 400
        : 502;

      return res.status(statusCode).json({
        message: `${subject} email could not be sent (${delivery.reason}).`,
        emailLog: emailLog[0] ? serializeEmailLog(emailLog[0].toObject()) : null,
      });
    }

    session.lastEmailAt = new Date();
    await session.save();

    return res.json({
      message: `${subject} email sent successfully.`,
      session: serializeSession(session.toObject()),
      emailLog: serializeEmailLog(emailLog[0].toObject()),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getCandidatePacket = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const sessionId = String(req.params.sessionId || "").trim();
    const candidateId = String(req.params.candidateId || "").trim();

    const session = await fetchSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const ownedJob = await fetchOwnedJobForSession(req.user.id, session);
    if (!ownedJob) {
      return res.status(404).json({ message: "Session not found" });
    }

    const candidateSlot = (session.candidates || []).find(
      (candidate) => candidate.candidateId === candidateId,
    );

    if (!candidateSlot) {
      return res.status(404).json({ message: "Candidate is not assigned to this session" });
    }

    const [candidateSubmission, interviewer] = await Promise.all([
      fetchCandidateSubmission(candidateId),
      fetchScopedInterviewerById(req.user, session.interviewerId),
    ]);

    const candidate = candidateSubmission ? serializeCandidate(candidateSubmission) : null;

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (String(candidate.jobId) !== String(session.jobId)) {
      return res.status(400).json({
        message: "Candidate does not belong to this session's job form",
      });
    }

    return res.json({
      generatedAt: new Date().toISOString(),
      candidate,
      session: {
        id: session.sessionId,
        name: session.name,
        jobTitle: ownedJob.title,
        jobForm: {
          id: String(ownedJob._id),
          title: ownedJob.title,
          description: String(ownedJob.description || ""),
          jobRole: String(ownedJob.jobRole || ""),
          fields: (ownedJob.fields || []).map((field) => ({
            label: String(field.label || ""),
            type: String(field.type || "text"),
            required: field.required !== false,
            order: Number.isFinite(field.order) ? field.order : 0,
          })),
        },
        interviewer: interviewer ? buildUserFullName(interviewer) : "Unassigned",
        interviewerEmail: interviewer ? interviewer.email : "",
        meetingId:
          session.meetingId || generateSessionMeetingId(session.sessionId),
        meetingPassword:
          session.meetingPassword ||
          generateSessionMeetingPassword(session.sessionId),
        deadline: formatDateInput(session.deadline),
        sessionDate: formatDateInput(session.sessionDate),
        defaultStartTime: session.startTime,
        requirements: session.requirements,
        remarks: session.remarks,
      },
      interviewSlot: {
        candidateSlotTime: candidateSlot.slotTime,
        durationMinutes: candidateSlot.durationMinutes,
        result: candidateSlot.result,
        notes: candidateSlot.notes,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
