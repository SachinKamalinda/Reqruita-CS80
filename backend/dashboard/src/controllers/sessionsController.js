const SessionJobForm = require("../models/SessionJobForm");
const SessionInterviewer = require("../models/SessionInterviewer");
const SessionCandidate = require("../models/SessionCandidate");
const InterviewSession = require("../models/InterviewSession");
const SessionEmailTemplate = require("../models/SessionEmailTemplate");
const SessionEmailLog = require("../models/SessionEmailLog");

const SESSION_ACCESS_ROLES = new Set([
  "admin",
  "recruiter",
  "hr manager",
  "interviewer",
]);

const DEFAULT_JOB_FORMS = [
  {
    jobId: "JOB-SE-2026",
    title: "Senior Software Engineer",
    position: "Software Engineer",
    applicants: 120,
  },
  {
    jobId: "JOB-FE-2026",
    title: "Frontend Engineer",
    position: "Frontend Engineer",
    applicants: 90,
  },
  {
    jobId: "JOB-QA-2026",
    title: "QA Automation Engineer",
    position: "QA Engineer",
    applicants: 70,
  },
];

const DEFAULT_INTERVIEWERS = [
  {
    interviewerId: "INT-001",
    name: "Mia Carter",
    email: "mia.carter@reqruita.com",
    specialty: "Backend Systems",
  },
  {
    interviewerId: "INT-002",
    name: "Liam Green",
    email: "liam.green@reqruita.com",
    specialty: "Frontend Architecture",
  },
  {
    interviewerId: "INT-003",
    name: "Noah Hall",
    email: "noah.hall@reqruita.com",
    specialty: "Cloud and DevOps",
  },
  {
    interviewerId: "INT-004",
    name: "Emma Stone",
    email: "emma.stone@reqruita.com",
    specialty: "Behavioral Interviewing",
  },
];

const DEFAULT_EMAIL_TEMPLATES = {
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

const RESULT_VALUES = new Set(["Pending", "Passed", "Failed", "On Hold"]);

const FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Taylor",
  "Sam",
  "Riley",
  "Casey",
  "Avery",
  "Morgan",
  "Drew",
  "Skyler",
  "Parker",
  "Jamie",
  "Elliot",
  "Kris",
  "Quinn",
];

const LAST_NAMES = [
  "Perera",
  "Silva",
  "Fernando",
  "Jayasuriya",
  "Gunasekara",
  "Wijesinghe",
  "Dias",
  "Ramanayake",
  "Abeysekera",
  "Ilangakoon",
  "Mendis",
  "Samarasinghe",
  "Seneviratne",
  "Karunaratne",
  "Bandara",
];

const LOCATIONS = [
  "Colombo",
  "Kandy",
  "Galle",
  "Jaffna",
  "Negombo",
  "Kurunegala",
  "Matara",
  "Nugegoda",
];

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

const toTimeString = (baseTime, additionalMinutes) => {
  const [hoursPart, minutesPart] = String(baseTime || "09:00").split(":");
  const hours = Number.parseInt(hoursPart, 10);
  const minutes = Number.parseInt(minutesPart, 10);

  const total = (Number.isNaN(hours) ? 9 : hours) * 60 +
    (Number.isNaN(minutes) ? 0 : minutes) +
    additionalMinutes;

  const safeTotal = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(safeTotal / 60)).padStart(2, "0");
  const mm = String(safeTotal % 60).padStart(2, "0");

  return `${hh}:${mm}`;
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

const buildCandidatesForJob = (jobId, total) =>
  Array.from({ length: total }, (_, index) => {
    const first = FIRST_NAMES[index % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
    const sequence = index + 1;
    const emailFirst = first.toLowerCase();
    const emailLast = last.toLowerCase();
    const location = LOCATIONS[index % LOCATIONS.length];
    const experienceYears = (index % 8) + 1;

    return {
      candidateId: `${jobId}-C${sequence.toString().padStart(3, "0")}`,
      jobId,
      name: `${first} ${last}`,
      email: `${emailFirst}.${emailLast}${sequence}@mail.reqruita.com`,
      phone: `+94 77 ${String(1000000 + sequence).slice(-7)}`,
      location,
      experienceYears,
      portfolioUrl: `https://portfolio.reqruita.dev/${emailFirst}-${emailLast}-${sequence}`,
      resumeFile: `${first}_${last}_${sequence}.pdf`,
      appliedDate: addDays(new Date(), -((index % 24) + 1)),
      summary: `${experienceYears} years in engineering with emphasis on clean architecture, communication, and production delivery.`,
    };
  });

const serializeJob = (job) => ({
  id: job.jobId,
  title: job.title,
  position: job.position,
  applicants: job.applicants,
});

const serializeInterviewer = (interviewer) => ({
  id: interviewer.interviewerId,
  name: interviewer.name,
  email: interviewer.email,
  specialty: interviewer.specialty,
});

const serializeCandidate = (candidate) => ({
  id: candidate.candidateId,
  jobId: candidate.jobId,
  name: candidate.name,
  email: candidate.email,
  phone: candidate.phone,
  location: candidate.location,
  experienceYears: candidate.experienceYears,
  portfolioUrl: candidate.portfolioUrl,
  resumeFile: candidate.resumeFile,
  appliedDate: formatDateInput(candidate.appliedDate),
  summary: candidate.summary,
});

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
    const jobsCount = await SessionJobForm.countDocuments();
    if (jobsCount === 0) {
      await SessionJobForm.insertMany(DEFAULT_JOB_FORMS);
    }

    const interviewerCount = await SessionInterviewer.countDocuments();
    if (interviewerCount === 0) {
      await SessionInterviewer.insertMany(DEFAULT_INTERVIEWERS);
    }

    const candidateCount = await SessionCandidate.countDocuments();
    if (candidateCount === 0) {
      const generatedCandidates = DEFAULT_JOB_FORMS.flatMap((job) =>
        buildCandidatesForJob(job.jobId, job.applicants),
      );
      await SessionCandidate.insertMany(generatedCandidates);
    }

    const templateCount = await SessionEmailTemplate.countDocuments();
    if (templateCount === 0) {
      const templateRows = Object.entries(DEFAULT_EMAIL_TEMPLATES).map(
        ([templateKey, content]) => ({
          templateKey,
          content,
        }),
      );
      await SessionEmailTemplate.insertMany(templateRows);
    }

    const sessionCount = await InterviewSession.countDocuments();
    if (sessionCount === 0) {
      const [seCandidates, feCandidates] = await Promise.all([
        SessionCandidate.find({ jobId: "JOB-SE-2026" })
          .sort({ candidateId: 1 })
          .select("candidateId")
          .lean(),
        SessionCandidate.find({ jobId: "JOB-FE-2026" })
          .sort({ candidateId: 1 })
          .select("candidateId")
          .lean(),
      ]);

      const seIds = seCandidates.map((candidate) => candidate.candidateId);
      const feIds = feCandidates.map((candidate) => candidate.candidateId);

      const firstSessionResults = ["Passed", "Pending", "On Hold", "Failed"];
      const firstSessionNotes = [
        "Strong architecture explanation.",
        "Needs deeper API design discussion.",
        "Waiting for panel confirmation.",
        "Limited backend depth.",
      ];

      const sessionOneCandidates = seIds.slice(0, 4).map((candidateId, index) => ({
        candidateId,
        slotTime: toTimeString("09:00", index * 30),
        durationMinutes: 30,
        result: firstSessionResults[index],
        notes: firstSessionNotes[index],
      }));

      const sessionTwoCandidates = seIds.slice(4, 8).map((candidateId, index) => ({
        candidateId,
        slotTime: toTimeString("13:00", index * 30),
        durationMinutes: 30,
        result: "Pending",
        notes: "Initial assessment pending.",
      }));

      const sessionThreeCandidates = feIds.slice(0, 3).map((candidateId, index) => ({
        candidateId,
        slotTime: toTimeString("10:00", index * 35),
        durationMinutes: 35,
        result: index === 0 ? "Passed" : "Pending",
        notes: index === 0 ? "Good React system thinking." : "Awaiting interview.",
      }));

      const now = new Date();
      const sessionOneId = "JOB-SE-2026-S01";
      const sessionTwoId = "JOB-SE-2026-S02";
      const sessionThreeId = "JOB-FE-2026-S01";
      await InterviewSession.insertMany([
        {
          sessionId: sessionOneId,
          jobId: "JOB-SE-2026",
          name: "Session 1",
          interviewerId: "INT-001",
          deadline: addDays(now, 4),
          requirements:
            "Assess backend architecture, performance trade-offs, and debugging approach.",
          remarks:
            "Focus on practical scalability decisions and communication under pressure.",
          sessionDate: addDays(now, 6),
          startTime: "09:00",
          durationMinutes: 30,
          meetingId: generateSessionMeetingId(sessionOneId),
          meetingPassword: generateSessionMeetingPassword(sessionOneId),
          status: "Scheduled",
          candidates: sessionOneCandidates,
          lastEmailAt: now,
        },
        {
          sessionId: sessionTwoId,
          jobId: "JOB-SE-2026",
          name: "Session 2",
          interviewerId: "INT-003",
          deadline: addDays(now, 5),
          requirements:
            "Evaluate cloud-native deployment awareness and incident response thinking.",
          remarks: "Probe CI/CD reliability and ownership mindset.",
          sessionDate: addDays(now, 7),
          startTime: "13:00",
          durationMinutes: 30,
          meetingId: generateSessionMeetingId(sessionTwoId),
          meetingPassword: generateSessionMeetingPassword(sessionTwoId),
          status: "Draft",
          candidates: sessionTwoCandidates,
          lastEmailAt: null,
        },
        {
          sessionId: sessionThreeId,
          jobId: "JOB-FE-2026",
          name: "Frontend Session 1",
          interviewerId: "INT-002",
          deadline: addDays(now, 3),
          requirements:
            "Check component architecture, state management, and accessibility basics.",
          remarks: "Request one production issue troubleshooting example.",
          sessionDate: addDays(now, 5),
          startTime: "10:00",
          durationMinutes: 35,
          meetingId: generateSessionMeetingId(sessionThreeId),
          meetingPassword: generateSessionMeetingPassword(sessionThreeId),
          status: "Scheduled",
          candidates: sessionThreeCandidates,
          lastEmailAt: now,
        },
      ]);
    }

    hasSeededSessionData = true;
  })();

  try {
    await seedInFlight;
  } finally {
    seedInFlight = null;
  }
};

const fetchSessionById = async (sessionId) =>
  InterviewSession.findOne({ sessionId });

exports.getBootstrap = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();

    const requestedJobId = String(req.query.jobId || "").trim();
    const sessionFilter = requestedJobId ? { jobId: requestedJobId } : {};
    const candidateFilter = requestedJobId ? { jobId: requestedJobId } : {};

    const [jobs, interviewers, sessions, candidates, templates, emailLogs] = await Promise.all([
      SessionJobForm.find({}).sort({ jobId: 1 }).lean(),
      SessionInterviewer.find({}).sort({ interviewerId: 1 }).lean(),
      InterviewSession.find(sessionFilter).sort({ sessionDate: 1, sessionId: 1 }).lean(),
      SessionCandidate.find(candidateFilter).sort({ candidateId: 1 }).lean(),
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
    const jobs = await SessionJobForm.find({}).sort({ jobId: 1 }).lean();
    res.json(jobs.map(serializeJob));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getInterviewers = async (req, res) => {
  try {
    if (!hasSessionPermission(req, res)) return;

    await ensureSessionSeedData();
    const interviewers = await SessionInterviewer.find({}).sort({ interviewerId: 1 }).lean();
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
    const filter = requestedJobId ? { jobId: requestedJobId } : {};

    const candidates = await SessionCandidate.find(filter).sort({ candidateId: 1 }).lean();
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
    const filter = requestedJobId ? { jobId: requestedJobId } : {};

    const sessions = await InterviewSession.find(filter)
      .sort({ sessionDate: 1, sessionId: 1 })
      .lean();

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
      SessionJobForm.findOne({ jobId: String(jobId).trim() }).lean(),
      SessionInterviewer.findOne({ interviewerId: String(interviewerId).trim() }).lean(),
      InterviewSession.find({ jobId: String(jobId).trim() }).select("sessionId").lean(),
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
    const generatedSessionId = `${job.jobId}-S${String(nextSessionNumber).padStart(2, "0")}`;
    const generatedSessionName =
      String(sessionName || "").trim() || `Session ${nextSessionNumber}`;

    const createdSession = await InterviewSession.create({
      sessionId: generatedSessionId,
      jobId: job.jobId,
      name: generatedSessionName,
      interviewerId: interviewer.interviewerId,
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
      interviewerName: interviewer.name,
      sessionName: generatedSessionName,
      jobTitle: job.title,
      deadline: formatHumanDate(deadlineDate),
      sessionDate: formatHumanDate(sessionDateValue),
      requirements: String(requirements).trim(),
      remarks: String(remarks).trim(),
    });

    await appendEmailLogs([
      {
        category: "Session",
        recipient: interviewer.email,
        subject: `${generatedSessionName} created for ${job.title}`,
        details: sessionEmailMessage,
        metadata: {
          sessionId: generatedSessionId,
          jobId: job.jobId,
        },
      },
    ]);

    return res.status(201).json({
      message: `${generatedSessionName} created and session email sent for ${job.title}.`,
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

    const [candidate, targetSession] = await Promise.all([
      SessionCandidate.findOne({ candidateId }).lean(),
      InterviewSession.findOne({ sessionId: targetSessionId }),
    ]);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!targetSession) {
      return res.status(404).json({ message: "Target session not found" });
    }

    if (targetSession.jobId !== candidate.jobId) {
      return res.status(400).json({
        message: "Candidate can only be assigned to sessions under the same job form",
      });
    }

    const previouslyAssignedSession = await InterviewSession.findOne({
      jobId: candidate.jobId,
      "candidates.candidateId": candidateId,
    })
      .select("sessionId name")
      .lean();

    await InterviewSession.updateMany(
      { jobId: candidate.jobId },
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
      SessionInterviewer.findOne({ interviewerId: refreshedTargetSession.interviewerId }).lean(),
      SessionJobForm.findOne({ jobId: refreshedTargetSession.jobId }).lean(),
      buildTemplateMap(),
    ]);

    const assignmentMessage = applyEmailTemplate(emailTemplates.container2, {
      candidateName: candidate.name,
      sessionName: refreshedTargetSession.name,
      jobTitle: job ? job.title : refreshedTargetSession.jobId,
      interviewerName: interviewer ? interviewer.name : "Interviewer",
      sessionDate: formatHumanDate(refreshedTargetSession.sessionDate),
      durationMinutes: refreshedTargetSession.durationMinutes,
    });

    await appendEmailLogs([
      {
        category: "Assignment",
        recipient: candidate.email,
        subject: `Interview assigned: ${refreshedTargetSession.name}`,
        details: assignmentMessage,
        metadata: {
          sessionId: refreshedTargetSession.sessionId,
          candidateId,
        },
      },
    ]);

    const message = previouslyAssignedSession
      ? `${candidate.name} moved from ${previouslyAssignedSession.name} to ${refreshedTargetSession.name} and assignment email sent.`
      : `${candidate.name} assigned to ${refreshedTargetSession.name} and email sent.`;

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

    const [candidate, session] = await Promise.all([
      SessionCandidate.findOne({ candidateId }).lean(),
      InterviewSession.findOne({ "candidates.candidateId": candidateId }),
    ]);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (!session) {
      return res.status(400).json({
        message: "Candidate must be assigned to a session before sending assignment email",
      });
    }

    const [interviewer, job, emailTemplates] = await Promise.all([
      SessionInterviewer.findOne({ interviewerId: session.interviewerId }).lean(),
      SessionJobForm.findOne({ jobId: session.jobId }).lean(),
      buildTemplateMap(),
    ]);

    const assignmentMessage = applyEmailTemplate(emailTemplates.container2, {
      candidateName: candidate.name,
      sessionName: session.name,
      jobTitle: job ? job.title : session.jobId,
      interviewerName: interviewer ? interviewer.name : "Interviewer",
      sessionDate: formatHumanDate(session.sessionDate),
      durationMinutes: session.durationMinutes,
    });

    await appendEmailLogs([
      {
        category: "Assignment",
        recipient: candidate.email,
        subject: `Assignment update: ${session.name}`,
        details: assignmentMessage,
        metadata: {
          sessionId: session.sessionId,
          candidateId,
        },
      },
    ]);

    session.lastEmailAt = new Date();
    await session.save();

    return res.json({
      message: `Assignment email sent to ${candidate.name}.`,
      session: serializeSession(session.toObject()),
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

    if (!session.candidates || session.candidates.length === 0) {
      return res.status(400).json({
        message: "No candidates in this session yet. Assign candidates before sending schedule emails.",
      });
    }

    const [interviewer, job, emailTemplates] = await Promise.all([
      SessionInterviewer.findOne({ interviewerId: session.interviewerId }).lean(),
      SessionJobForm.findOne({ jobId: session.jobId }).lean(),
      buildTemplateMap(),
    ]);

    const scheduleForInterviewer = applyEmailTemplate(
      emailTemplates.container3Schedule,
      {
        recipientName: interviewer ? interviewer.name : "Interviewer",
        sessionName: session.name,
        jobTitle: job ? job.title : session.jobId,
        action: "Schedule confirmed",
        slotTime: session.startTime,
        durationMinutes: session.durationMinutes,
        resultSummary: `${session.candidates.length} candidates notified`,
      },
    );

    const scheduleForCandidates = applyEmailTemplate(
      emailTemplates.container3Schedule,
      {
        recipientName: "Candidate",
        sessionName: session.name,
        jobTitle: job ? job.title : session.jobId,
        action: "Interview schedule",
        slotTime: session.startTime,
        durationMinutes: session.durationMinutes,
        resultSummary: "Check your exact slot in dashboard",
      },
    );

    const emailLogs = await appendEmailLogs([
      {
        category: "Schedule",
        recipient: interviewer ? interviewer.email : "Interviewer not assigned",
        subject: `${session.name} schedule confirmed`,
        details: scheduleForInterviewer,
        metadata: {
          sessionId: session.sessionId,
        },
      },
      {
        category: "Schedule",
        recipient: `${session.candidates.length} candidates in ${session.name}`,
        subject: `${session.name} slot schedule`,
        details: scheduleForCandidates,
        metadata: {
          sessionId: session.sessionId,
        },
      },
    ]);

    if (session.status !== "Completed") {
      session.status = "Scheduled";
    }
    session.lastEmailAt = new Date();
    await session.save();

    return res.json({
      message: `Schedule emails sent for ${session.name}. Session marked as Scheduled.`,
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

    const breakdown = getSessionBreakdown(session);
    const reviewed = breakdown.passed + breakdown.failed + breakdown.onHold;

    if (reviewed === 0) {
      return res.status(400).json({
        message: "Set candidate results before sending outcome emails from container 3.",
      });
    }

    const [interviewer, job, emailTemplates] = await Promise.all([
      SessionInterviewer.findOne({ interviewerId: session.interviewerId }).lean(),
      SessionJobForm.findOne({ jobId: session.jobId }).lean(),
      buildTemplateMap(),
    ]);

    const resultSummary = `${breakdown.passed} passed, ${breakdown.failed} failed, ${breakdown.onHold} on hold, ${breakdown.pending} pending`;

    const resultForInterviewer = applyEmailTemplate(
      emailTemplates.container3Result,
      {
        recipientName: interviewer ? interviewer.name : "Interviewer",
        sessionName: session.name,
        jobTitle: job ? job.title : session.jobId,
        action: "Result publication",
        slotTime: session.startTime,
        durationMinutes: session.durationMinutes,
        resultSummary,
      },
    );

    const resultForCandidates = applyEmailTemplate(
      emailTemplates.container3Result,
      {
        recipientName: "Candidate",
        sessionName: session.name,
        jobTitle: job ? job.title : session.jobId,
        action: "Result notification",
        slotTime: "Refer to your slot",
        durationMinutes: session.durationMinutes,
        resultSummary,
      },
    );

    const emailLogs = await appendEmailLogs([
      {
        category: "Result",
        recipient: interviewer ? interviewer.email : "Interviewer not assigned",
        subject: `${session.name} result summary`,
        details: resultForInterviewer,
        metadata: {
          sessionId: session.sessionId,
          reviewed,
        },
      },
      {
        category: "Result",
        recipient: `${reviewed} candidates in ${session.name}`,
        subject: `${session.name} interview outcomes`,
        details: resultForCandidates,
        metadata: {
          sessionId: session.sessionId,
          reviewed,
        },
      },
    ]);

    if (breakdown.pending === 0) {
      session.status = "Completed";
    }

    session.lastEmailAt = new Date();
    await session.save();

    return res.json({
      message: `Result emails sent for ${session.name}. Reviewed candidates: ${reviewed}.`,
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

    const slot = (session.candidates || []).find(
      (candidate) => candidate.candidateId === candidateId,
    );
    if (!slot) {
      return res.status(404).json({ message: "Candidate is not assigned to this session" });
    }

    const [candidate, job, emailTemplates] = await Promise.all([
      SessionCandidate.findOne({ candidateId }).lean(),
      SessionJobForm.findOne({ jobId: session.jobId }).lean(),
      buildTemplateMap(),
    ]);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
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
      jobTitle: job ? job.title : session.jobId,
      action,
      slotTime: slot.slotTime || session.startTime,
      durationMinutes: slot.durationMinutes,
      resultSummary: slot.result,
    });

    const emailLog = await appendEmailLogs([
      {
        category: EMAIL_OPTION_TO_CATEGORY[emailOption],
        recipient: candidate.email,
        subject,
        details,
        metadata: {
          sessionId: session.sessionId,
          candidateId,
        },
      },
    ]);

    session.lastEmailAt = new Date();
    await session.save();

    return res.json({
      message: `${subject} email queued successfully.`,
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

    const candidateSlot = (session.candidates || []).find(
      (candidate) => candidate.candidateId === candidateId,
    );

    if (!candidateSlot) {
      return res.status(404).json({ message: "Candidate is not assigned to this session" });
    }

    const [candidate, job, interviewer] = await Promise.all([
      SessionCandidate.findOne({ candidateId }).lean(),
      SessionJobForm.findOne({ jobId: session.jobId }).lean(),
      SessionInterviewer.findOne({ interviewerId: session.interviewerId }).lean(),
    ]);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    return res.json({
      generatedAt: new Date().toISOString(),
      candidate: serializeCandidate(candidate),
      session: {
        id: session.sessionId,
        name: session.name,
        jobTitle: job ? job.title : session.jobId,
        interviewer: interviewer ? interviewer.name : "Unassigned",
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
