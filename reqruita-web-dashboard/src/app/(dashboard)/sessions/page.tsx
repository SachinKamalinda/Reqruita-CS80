"use client";

import { useMemo, useState } from "react";

type CandidateResult = "Pending" | "Passed" | "Failed" | "On Hold";

type SessionStatus = "Draft" | "Scheduled" | "Completed";

interface JobForm {
  id: string;
  title: string;
  position: string;
  applicants: number;
}

interface Interviewer {
  id: string;
  name: string;
  email: string;
  specialty: string;
}

interface Candidate {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  experienceYears: number;
  portfolioUrl: string;
  resumeFile: string;
  appliedDate: string;
  summary: string;
}

interface SessionCandidate {
  candidateId: string;
  slotTime: string;
  durationMinutes: number;
  result: CandidateResult;
  notes: string;
}

interface InterviewSession {
  id: string;
  jobId: string;
  name: string;
  interviewerId: string;
  deadline: string;
  requirements: string;
  remarks: string;
  sessionDate: string;
  startTime: string;
  durationMinutes: number;
  status: SessionStatus;
  candidates: SessionCandidate[];
  lastEmailAt: string | null;
}

type EmailCategory =
  | "Session"
  | "Assignment"
  | "Schedule"
  | "Result"
  | "Reminder";

interface EmailLog {
  id: number;
  sentAt: string;
  category: EmailCategory;
  recipient: string;
  subject: string;
  details: string;
}

interface SessionBreakdown {
  pending: number;
  passed: number;
  failed: number;
  onHold: number;
}

interface CreateSessionForm {
  jobId: string;
  sessionName: string;
  interviewerId: string;
  deadline: string;
  sessionDate: string;
  startTime: string;
  durationMinutes: number;
  requirements: string;
  remarks: string;
}

type AssignmentFilter = "all" | "assigned" | "unassigned";

type EmailTemplateKey =
  | "container1"
  | "container2"
  | "container3Schedule"
  | "container3Result"
  | "container3Reminder";

type Container3EmailOption = "schedule" | "result" | "reminder";

type EmailTemplates = Record<EmailTemplateKey, string>;

const JOB_FORMS: JobForm[] = [
  {
    id: "JOB-SE-2026",
    title: "Senior Software Engineer",
    position: "Software Engineer",
    applicants: 120,
  },
  {
    id: "JOB-FE-2026",
    title: "Frontend Engineer",
    position: "Frontend Engineer",
    applicants: 90,
  },
  {
    id: "JOB-QA-2026",
    title: "QA Automation Engineer",
    position: "QA Engineer",
    applicants: 70,
  },
];

const INTERVIEWERS: Interviewer[] = [
  {
    id: "INT-001",
    name: "Mia Carter",
    email: "mia.carter@reqruita.com",
    specialty: "Backend Systems",
  },
  {
    id: "INT-002",
    name: "Liam Green",
    email: "liam.green@reqruita.com",
    specialty: "Frontend Architecture",
  },
  {
    id: "INT-003",
    name: "Noah Hall",
    email: "noah.hall@reqruita.com",
    specialty: "Cloud and DevOps",
  },
  {
    id: "INT-004",
    name: "Emma Stone",
    email: "emma.stone@reqruita.com",
    specialty: "Behavioral Interviewing",
  },
];

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

const RESULT_STYLES: Record<CandidateResult, string> = {
  Pending: "bg-gray-100 text-gray-700",
  Passed: "bg-emerald-100 text-emerald-800",
  Failed: "bg-red-100 text-red-800",
  "On Hold": "bg-amber-100 text-amber-800",
};

const DEFAULT_EMAIL_TEMPLATES: EmailTemplates = {
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

const CONTAINER3_TEMPLATE_KEYS: Record<
  Container3EmailOption,
  EmailTemplateKey
> = {
  schedule: "container3Schedule",
  result: "container3Result",
  reminder: "container3Reminder",
};

const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const formatDateInput = (date: Date): string => date.toISOString().slice(0, 10);

const formatHumanDate = (value: string): string => {
  if (!value) return "Not set";

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const applyEmailTemplate = (
  template: string,
  values: Record<string, string | number>,
): string =>
  template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });

const buildCandidatesForJob = (jobId: string, total: number): Candidate[] =>
  Array.from({ length: total }, (_, index) => {
    const first = FIRST_NAMES[index % FIRST_NAMES.length];
    const last =
      LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
    const sequence = index + 1;
    const emailFirst = first.toLowerCase();
    const emailLast = last.toLowerCase();
    const location = LOCATIONS[index % LOCATIONS.length];
    const experienceYears = (index % 8) + 1;
    const appliedDate = formatDateInput(
      addDays(new Date(), -((index % 24) + 1)),
    );

    return {
      id: `${jobId}-C${sequence.toString().padStart(3, "0")}`,
      jobId,
      name: `${first} ${last}`,
      email: `${emailFirst}.${emailLast}${sequence}@mail.reqruita.com`,
      phone: `+94 77 ${String(1000000 + sequence).slice(-7)}`,
      location,
      experienceYears,
      portfolioUrl: `https://portfolio.reqruita.dev/${emailFirst}-${emailLast}-${sequence}`,
      resumeFile: `${first}_${last}_${sequence}.pdf`,
      appliedDate,
      summary: `${experienceYears} years in engineering with emphasis on clean architecture, communication, and production delivery.`,
    };
  });

const CANDIDATE_POOL: Record<string, Candidate[]> = JOB_FORMS.reduce<
  Record<string, Candidate[]>
>((accumulator, job) => {
  accumulator[job.id] = buildCandidatesForJob(job.id, job.applicants);
  return accumulator;
}, {});

const CANDIDATE_LOOKUP: Record<string, Candidate> = Object.values(
  CANDIDATE_POOL,
)
  .flat()
  .reduce<Record<string, Candidate>>((accumulator, candidate) => {
    accumulator[candidate.id] = candidate;
    return accumulator;
  }, {});

const buildDummySessions = (): InterviewSession[] => {
  const sessionOneCandidates: SessionCandidate[] = (
    CANDIDATE_POOL["JOB-SE-2026"] ?? []
  )
    .slice(0, 4)
    .map((candidate, index) => ({
      candidateId: candidate.id,
      slotTime: `09:${(index * 30).toString().padStart(2, "0")}`,
      durationMinutes: 30,
      result:
        index === 0
          ? "Passed"
          : index === 1
            ? "Pending"
            : index === 2
              ? "On Hold"
              : "Failed",
      notes:
        index === 0
          ? "Strong architecture explanation."
          : index === 1
            ? "Needs deeper API design discussion."
            : index === 2
              ? "Waiting for panel confirmation."
              : "Limited backend depth.",
    }));

  const sessionTwoCandidates: SessionCandidate[] = (
    CANDIDATE_POOL["JOB-SE-2026"] ?? []
  )
    .slice(4, 8)
    .map((candidate, index) => ({
      candidateId: candidate.id,
      slotTime: `13:${(index * 30).toString().padStart(2, "0")}`,
      durationMinutes: 30,
      result: "Pending" as CandidateResult,
      notes: "Initial assessment pending.",
    }));

  const sessionThreeCandidates: SessionCandidate[] = (
    CANDIDATE_POOL["JOB-FE-2026"] ?? []
  )
    .slice(0, 3)
    .map((candidate, index) => ({
      candidateId: candidate.id,
      slotTime: `10:${(index * 35).toString().padStart(2, "0")}`,
      durationMinutes: 35,
      result: index === 0 ? "Passed" : "Pending",
      notes:
        index === 0 ? "Good React system thinking." : "Awaiting interview.",
    }));

  return [
    {
      id: "JOB-SE-2026-S01",
      jobId: "JOB-SE-2026",
      name: "Session 1",
      interviewerId: "INT-001",
      deadline: formatDateInput(addDays(new Date(), 4)),
      requirements:
        "Assess backend architecture, performance trade-offs, and debugging approach.",
      remarks:
        "Focus on practical scalability decisions and communication under pressure.",
      sessionDate: formatDateInput(addDays(new Date(), 6)),
      startTime: "09:00",
      durationMinutes: 30,
      status: "Scheduled",
      candidates: sessionOneCandidates,
      lastEmailAt: new Date().toLocaleString(),
    },
    {
      id: "JOB-SE-2026-S02",
      jobId: "JOB-SE-2026",
      name: "Session 2",
      interviewerId: "INT-003",
      deadline: formatDateInput(addDays(new Date(), 5)),
      requirements:
        "Evaluate cloud-native deployment awareness and incident response thinking.",
      remarks: "Probe CI/CD reliability and ownership mindset.",
      sessionDate: formatDateInput(addDays(new Date(), 7)),
      startTime: "13:00",
      durationMinutes: 30,
      status: "Draft",
      candidates: sessionTwoCandidates,
      lastEmailAt: null,
    },
    {
      id: "JOB-FE-2026-S01",
      jobId: "JOB-FE-2026",
      name: "Frontend Session 1",
      interviewerId: "INT-002",
      deadline: formatDateInput(addDays(new Date(), 3)),
      requirements:
        "Check component architecture, state management, and accessibility basics.",
      remarks: "Request one production issue troubleshooting example.",
      sessionDate: formatDateInput(addDays(new Date(), 5)),
      startTime: "10:00",
      durationMinutes: 35,
      status: "Scheduled",
      candidates: sessionThreeCandidates,
      lastEmailAt: new Date().toLocaleString(),
    },
  ];
};

const getSessionBreakdown = (session: InterviewSession): SessionBreakdown =>
  session.candidates.reduce<SessionBreakdown>(
    (counts, candidate) => {
      switch (candidate.result) {
        case "Passed":
          counts.passed += 1;
          break;
        case "Failed":
          counts.failed += 1;
          break;
        case "On Hold":
          counts.onHold += 1;
          break;
        default:
          counts.pending += 1;
          break;
      }

      return counts;
    },
    { pending: 0, passed: 0, failed: 0, onHold: 0 },
  );

const downloadJsonFile = (filename: string, payload: unknown) => {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
};

const statCard = (label: string, value: string | number, helper: string) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4">
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    <p className="mt-1 text-xs text-gray-500">{helper}</p>
  </div>
);

export default function SessionsPage() {
  const [sessions, setSessions] =
    useState<InterviewSession[]>(buildDummySessions());
  const [, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplates>(
    DEFAULT_EMAIL_TEMPLATES,
  );
  const [statusMessage, setStatusMessage] = useState<string>("Ready.");

  const [createForm, setCreateForm] = useState<CreateSessionForm>({
    jobId: JOB_FORMS[0].id,
    sessionName: "",
    interviewerId: "",
    deadline: formatDateInput(addDays(new Date(), 5)),
    sessionDate: formatDateInput(addDays(new Date(), 7)),
    startTime: "09:00",
    durationMinutes: 30,
    requirements: "",
    remarks: "",
  });
  const [showCreateSessionModal, setShowCreateSessionModal] =
    useState<boolean>(false);
  const [showContainer1TemplateModal, setShowContainer1TemplateModal] =
    useState<boolean>(false);
  const [showContainer2TemplateModal, setShowContainer2TemplateModal] =
    useState<boolean>(false);
  const [showContainer3TemplateModal, setShowContainer3TemplateModal] =
    useState<boolean>(false);
  const [container3TemplateEditorOption, setContainer3TemplateEditorOption] =
    useState<Container3EmailOption>("schedule");
  const [showSessionDetailsModal, setShowSessionDetailsModal] =
    useState<boolean>(false);
  const [showSessionCandidatesModal, setShowSessionCandidatesModal] =
    useState<boolean>(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const [candidateJobFilter, setCandidateJobFilter] = useState<string>(
    JOB_FORMS[0].id,
  );
  const [candidateSessionFilterId, setCandidateSessionFilterId] =
    useState<string>("all");
  const [candidateAssignmentFilter, setCandidateAssignmentFilter] =
    useState<AssignmentFilter>("all");
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignCandidateId, setAssignCandidateId] = useState<string | null>(
    null,
  );
  const [assignTargetSessionId, setAssignTargetSessionId] =
    useState<string>("");
  const [showContainer2DetailsModal, setShowContainer2DetailsModal] =
    useState<boolean>(false);
  const [container2DetailsCandidateId, setContainer2DetailsCandidateId] =
    useState<string | null>(null);

  const [interviewJobFilter, setInterviewJobFilter] = useState<string>(
    JOB_FORMS[0].id,
  );
  const [interviewSessionId, setInterviewSessionId] = useState<string>("");
  const [interviewCandidateSearch, setInterviewCandidateSearch] =
    useState<string>("");
  const [showContainer3DetailsModal, setShowContainer3DetailsModal] =
    useState<boolean>(false);
  const [container3DetailsCandidateId, setContainer3DetailsCandidateId] =
    useState<string | null>(null);
  const [container3DetailSlotTime, setContainer3DetailSlotTime] =
    useState<string>("");
  const [container3DetailDuration, setContainer3DetailDuration] =
    useState<number>(30);
  const [container3DetailResult, setContainer3DetailResult] =
    useState<CandidateResult>("Pending");
  const [container3DetailNotes, setContainer3DetailNotes] =
    useState<string>("");
  const [showContainer3EmailModal, setShowContainer3EmailModal] =
    useState<boolean>(false);
  const [container3EmailCandidateId, setContainer3EmailCandidateId] = useState<
    string | null
  >(null);
  const [container3EmailOption, setContainer3EmailOption] =
    useState<Container3EmailOption>("reminder");

  const jobLookup = useMemo(
    () =>
      JOB_FORMS.reduce<Record<string, JobForm>>((accumulator, job) => {
        accumulator[job.id] = job;
        return accumulator;
      }, {}),
    [],
  );

  const interviewerLookup = useMemo(
    () =>
      INTERVIEWERS.reduce<Record<string, Interviewer>>(
        (accumulator, person) => {
          accumulator[person.id] = person;
          return accumulator;
        },
        {},
      ),
    [],
  );

  const sessionsForCandidateJob = useMemo(
    () => sessions.filter((session) => session.jobId === candidateJobFilter),
    [sessions, candidateJobFilter],
  );

  const sessionsForInterviewJob = useMemo(
    () => sessions.filter((session) => session.jobId === interviewJobFilter),
    [sessions, interviewJobFilter],
  );

  const resolvedCandidateSessionFilterId = useMemo(() => {
    if (candidateSessionFilterId === "all") return "all";

    const exists = sessionsForCandidateJob.some(
      (session) => session.id === candidateSessionFilterId,
    );

    return exists ? candidateSessionFilterId : "all";
  }, [candidateSessionFilterId, sessionsForCandidateJob]);

  const resolvedInterviewSessionId = useMemo(() => {
    if (sessionsForInterviewJob.length === 0) return "";

    const exists = sessionsForInterviewJob.some(
      (session) => session.id === interviewSessionId,
    );

    return exists ? interviewSessionId : sessionsForInterviewJob[0].id;
  }, [sessionsForInterviewJob, interviewSessionId]);

  const assignedSessionByCandidateId = useMemo(() => {
    return sessionsForCandidateJob.reduce<Record<string, string>>(
      (accumulator, session) => {
        session.candidates.forEach((candidate) => {
          accumulator[candidate.candidateId] = session.id;
        });
        return accumulator;
      },
      {},
    );
  }, [sessionsForCandidateJob]);

  const sessionLookup = useMemo(
    () =>
      sessions.reduce<Record<string, InterviewSession>>(
        (accumulator, session) => {
          accumulator[session.id] = session;
          return accumulator;
        },
        {},
      ),
    [sessions],
  );

  const selectedSession = useMemo(() => {
    if (!selectedSessionId) return null;

    return sessionLookup[selectedSessionId] ?? null;
  }, [selectedSessionId, sessionLookup]);

  const selectedSessionCandidates = useMemo(() => {
    if (!selectedSession) return [];

    return selectedSession.candidates
      .map((slot) => {
        const candidate = CANDIDATE_LOOKUP[slot.candidateId];
        if (!candidate) return null;
        return { candidate, slot };
      })
      .filter(
        (
          row,
        ): row is {
          candidate: Candidate;
          slot: SessionCandidate;
        } => row !== null,
      );
  }, [selectedSession]);

  const activeContainer3TemplateKey = useMemo(
    () => CONTAINER3_TEMPLATE_KEYS[container3TemplateEditorOption],
    [container3TemplateEditorOption],
  );

  const assignModalCandidate = useMemo(
    () =>
      assignCandidateId ? (CANDIDATE_LOOKUP[assignCandidateId] ?? null) : null,
    [assignCandidateId],
  );

  const assignModalSessions = useMemo(() => {
    if (!assignModalCandidate) return [];

    return sessions.filter(
      (session) => session.jobId === assignModalCandidate.jobId,
    );
  }, [sessions, assignModalCandidate]);

  const resolvedAssignTargetSessionId = useMemo(() => {
    if (assignModalSessions.length === 0) return "";

    const exists = assignModalSessions.some(
      (session) => session.id === assignTargetSessionId,
    );

    return exists ? assignTargetSessionId : assignModalSessions[0].id;
  }, [assignModalSessions, assignTargetSessionId]);

  const container2DetailsCandidate = useMemo(
    () =>
      container2DetailsCandidateId
        ? (CANDIDATE_LOOKUP[container2DetailsCandidateId] ?? null)
        : null,
    [container2DetailsCandidateId],
  );

  const container2DetailsSession = useMemo(() => {
    if (!container2DetailsCandidate) return null;

    const assignedSessionId =
      assignedSessionByCandidateId[container2DetailsCandidate.id];
    if (!assignedSessionId) return null;

    return sessionLookup[assignedSessionId] ?? null;
  }, [container2DetailsCandidate, assignedSessionByCandidateId, sessionLookup]);

  const filteredCandidates = useMemo(() => {
    const candidatesForJob = CANDIDATE_POOL[candidateJobFilter] ?? [];

    return candidatesForJob.filter((candidate) => {
      const isAssigned = Boolean(assignedSessionByCandidateId[candidate.id]);
      const assignedSessionId =
        assignedSessionByCandidateId[candidate.id] ?? "";

      if (candidateAssignmentFilter === "assigned") {
        if (!isAssigned) return false;
      }

      if (candidateAssignmentFilter === "unassigned") {
        if (isAssigned) return false;
      }

      if (resolvedCandidateSessionFilterId !== "all") {
        return assignedSessionId === resolvedCandidateSessionFilterId;
      }

      return true;
    });
  }, [
    candidateJobFilter,
    candidateAssignmentFilter,
    resolvedCandidateSessionFilterId,
    assignedSessionByCandidateId,
  ]);

  const activeInterviewSession = useMemo(() => {
    const byId = sessionsForInterviewJob.find(
      (session) => session.id === resolvedInterviewSessionId,
    );

    return byId ?? sessionsForInterviewJob[0] ?? null;
  }, [sessionsForInterviewJob, resolvedInterviewSessionId]);

  const activeInterviewRows = useMemo(() => {
    if (!activeInterviewSession) return [];

    const query = interviewCandidateSearch.trim().toLowerCase();

    return activeInterviewSession.candidates
      .map((slot) => {
        const candidate = CANDIDATE_LOOKUP[slot.candidateId];
        if (!candidate) return null;
        return { slot, candidate };
      })
      .filter(
        (
          row,
        ): row is {
          slot: SessionCandidate;
          candidate: Candidate;
        } => row !== null,
      )
      .filter((row) => {
        if (!query) return true;

        const haystack =
          `${row.candidate.id} ${row.candidate.name} ${row.candidate.email} ${row.candidate.location}`.toLowerCase();

        return haystack.includes(query);
      });
  }, [activeInterviewSession, interviewCandidateSearch]);

  const container3DetailsRow = useMemo(() => {
    if (!container3DetailsCandidateId) return null;

    return (
      activeInterviewRows.find(
        (row) => row.candidate.id === container3DetailsCandidateId,
      ) ?? null
    );
  }, [container3DetailsCandidateId, activeInterviewRows]);

  const container3EmailRow = useMemo(() => {
    if (!container3EmailCandidateId) return null;

    return (
      activeInterviewRows.find(
        (row) => row.candidate.id === container3EmailCandidateId,
      ) ?? null
    );
  }, [container3EmailCandidateId, activeInterviewRows]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  const updateSession = (
    sessionId: string,
    updater: (session: InterviewSession) => InterviewSession,
  ) => {
    setSessions((previous) =>
      previous.map((session) =>
        session.id === sessionId ? updater(session) : session,
      ),
    );
  };

  const addEmailLogs = (entries: Omit<EmailLog, "id" | "sentAt">[]) => {
    if (entries.length === 0) return;

    setEmailLogs((previousLogs) => {
      const highestId = previousLogs[0]?.id ?? 0;
      const timestamp = new Date().toLocaleString();

      const created = entries.map((entry, index) => ({
        id: highestId + index + 1,
        sentAt: timestamp,
        ...entry,
      }));

      return [...created.reverse(), ...previousLogs].slice(0, 250);
    });
  };

  const updateEmailTemplate = (
    templateKey: EmailTemplateKey,
    value: string,
  ) => {
    setEmailTemplates((current) => ({
      ...current,
      [templateKey]: value,
    }));
  };

  const handleSaveTemplate = (container: EmailTemplateKey) => {
    setStatusMessage(`Automated email template saved for ${container}.`);
  };

  const handleOpenSessionDetails = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowSessionDetailsModal(true);
  };

  const handleOpenSessionCandidates = () => {
    if (!selectedSession) return;

    setShowSessionDetailsModal(false);
    setShowSessionCandidatesModal(true);
  };

  const handleConductSession = () => {
    if (!activeInterviewSession) {
      setStatusMessage("Select a valid session first.");
      return;
    }

    updateSession(activeInterviewSession.id, (current) => ({
      ...current,
      status: current.status === "Completed" ? "Completed" : "Scheduled",
      lastEmailAt: new Date().toLocaleString(),
    }));

    setStatusMessage(`Session started for ${activeInterviewSession.name}.`);
  };

  const handleOpenContainer2Details = (candidateId: string) => {
    setContainer2DetailsCandidateId(candidateId);
    setShowContainer2DetailsModal(true);
  };

  const handleOpenAssignModal = (candidateId: string) => {
    const candidate = CANDIDATE_LOOKUP[candidateId];

    if (!candidate) return;

    const sessionsForCandidate = sessions.filter(
      (session) => session.jobId === candidate.jobId,
    );

    if (sessionsForCandidate.length === 0) {
      setStatusMessage(
        "No existing session found for this job. Create a session in container 1 first.",
      );
      return;
    }

    setAssignCandidateId(candidateId);
    setAssignTargetSessionId(sessionsForCandidate[0].id);
    setShowAssignModal(true);
  };

  const handleConfirmAssignAndSendEmail = () => {
    if (!assignCandidateId || !resolvedAssignTargetSessionId) {
      setStatusMessage("Select a valid session before assigning.");
      return;
    }

    handleAssignCandidate(assignCandidateId, resolvedAssignTargetSessionId);
    setShowAssignModal(false);
    setAssignCandidateId(null);
  };

  const handleOpenContainer3Details = (candidateId: string) => {
    const row = activeInterviewRows.find(
      (item) => item.candidate.id === candidateId,
    );
    if (!row) return;

    setContainer3DetailsCandidateId(candidateId);
    setContainer3DetailSlotTime(row.slot.slotTime);
    setContainer3DetailDuration(row.slot.durationMinutes);
    setContainer3DetailResult(row.slot.result);
    setContainer3DetailNotes(row.slot.notes);
    setShowContainer3DetailsModal(true);
  };

  const handleSaveContainer3Details = () => {
    if (!container3DetailsCandidateId) return;

    handleUpdateActiveCandidate(container3DetailsCandidateId, {
      slotTime: container3DetailSlotTime,
      durationMinutes: clamp(container3DetailDuration, 10, 120),
      result: container3DetailResult,
      notes: container3DetailNotes,
    });

    setStatusMessage("Candidate interview details updated.");
    setShowContainer3DetailsModal(false);
  };

  const handleOpenContainer3EmailModal = (candidateId: string) => {
    setContainer3EmailCandidateId(candidateId);
    setContainer3EmailOption("reminder");
    setShowContainer3EmailModal(true);
  };

  const handleCreateSession = () => {
    const selectedJob = jobLookup[createForm.jobId];

    if (!selectedJob) {
      setStatusMessage("Select a valid job form before creating a session.");
      return;
    }

    if (!createForm.interviewerId) {
      setStatusMessage("Choose an interviewer before creating the session.");
      return;
    }

    if (!createForm.requirements.trim() || !createForm.remarks.trim()) {
      setStatusMessage(
        "Requirements and interviewer remarks are required for session creation.",
      );
      return;
    }

    const duration = clamp(createForm.durationMinutes, 10, 120);
    const nextNumber =
      sessions.filter((session) => session.jobId === createForm.jobId).length +
      1;
    const sessionName =
      createForm.sessionName.trim() || `Session ${nextNumber.toString()}`;
    const sessionId = `${createForm.jobId}-S${nextNumber.toString().padStart(2, "0")}`;
    const interviewer = interviewerLookup[createForm.interviewerId];
    const emailTimestamp = new Date().toLocaleString();
    const sessionEmailMessage = applyEmailTemplate(emailTemplates.container1, {
      interviewerName: interviewer?.name ?? "Interviewer",
      sessionName,
      jobTitle: selectedJob.title,
      deadline: formatHumanDate(createForm.deadline),
      sessionDate: formatHumanDate(createForm.sessionDate),
      requirements: createForm.requirements.trim(),
      remarks: createForm.remarks.trim(),
    });

    const newSession: InterviewSession = {
      id: sessionId,
      jobId: createForm.jobId,
      name: sessionName,
      interviewerId: createForm.interviewerId,
      deadline: createForm.deadline,
      requirements: createForm.requirements.trim(),
      remarks: createForm.remarks.trim(),
      sessionDate: createForm.sessionDate,
      startTime: createForm.startTime,
      durationMinutes: duration,
      status: "Draft",
      candidates: [],
      lastEmailAt: emailTimestamp,
    };

    setSessions((previous) => [...previous, newSession]);

    setCandidateJobFilter(createForm.jobId);
    setCandidateSessionFilterId("all");
    setInterviewJobFilter(createForm.jobId);
    setInterviewSessionId(sessionId);

    setCreateForm((current) => ({
      ...current,
      sessionName: "",
    }));

    addEmailLogs([
      {
        category: "Session",
        recipient: interviewer?.email ?? "Interviewer not assigned",
        subject: `${sessionName} created for ${selectedJob.title}`,
        details: sessionEmailMessage,
      },
    ]);

    setStatusMessage(
      `${sessionName} created and session email sent for ${selectedJob.title}. Use container 2 to assign candidates.`,
    );
    setShowCreateSessionModal(false);
  };

  const handleAssignCandidate = (
    candidateId: string,
    targetSessionId: string,
  ) => {
    const targetSession = sessionLookup[targetSessionId];
    const candidate = CANDIDATE_LOOKUP[candidateId];

    if (!targetSession || !candidate) {
      setStatusMessage(
        "Unable to assign candidate. Try selecting the session again.",
      );
      return;
    }

    if (targetSession.jobId !== candidate.jobId) {
      setStatusMessage(
        "Candidate can only be assigned to sessions under the same job form.",
      );
      return;
    }

    const previouslyAssignedSessionId =
      assignedSessionByCandidateId[candidateId];
    const previouslyAssignedSessionName = previouslyAssignedSessionId
      ? sessionLookup[previouslyAssignedSessionId]?.name
      : null;

    const now = new Date().toLocaleString();

    setSessions((previous) =>
      previous.map((session) => {
        if (session.jobId !== candidate.jobId) {
          return session;
        }

        const withoutCandidate = session.candidates.filter(
          (slot) => slot.candidateId !== candidateId,
        );

        if (session.id !== targetSession.id) {
          return {
            ...session,
            candidates: withoutCandidate,
          };
        }

        return {
          ...session,
          candidates: [
            ...withoutCandidate,
            {
              candidateId,
              slotTime: "",
              durationMinutes: session.durationMinutes,
              result: "Pending",
              notes: "",
            },
          ],
          lastEmailAt: now,
        };
      }),
    );

    const interviewer = interviewerLookup[targetSession.interviewerId];
    const selectedJob = jobLookup[targetSession.jobId];
    const assignmentMessage = applyEmailTemplate(emailTemplates.container2, {
      candidateName: candidate.name,
      sessionName: targetSession.name,
      jobTitle: selectedJob?.title ?? targetSession.jobId,
      interviewerName: interviewer?.name ?? "Interviewer",
      sessionDate: formatHumanDate(targetSession.sessionDate),
      durationMinutes: targetSession.durationMinutes,
    });

    addEmailLogs([
      {
        category: "Assignment",
        recipient: candidate.email,
        subject: `Interview assigned: ${targetSession.name}`,
        details: assignmentMessage,
      },
    ]);

    setStatusMessage(
      previouslyAssignedSessionName
        ? `${candidate.name} moved from ${previouslyAssignedSessionName} to ${targetSession.name} and assignment email sent.`
        : `${candidate.name} assigned to ${targetSession.name} and email sent.`,
    );
  };

  const handleSendAssignmentEmailToCandidate = (candidateId: string) => {
    const sessionId = assignedSessionByCandidateId[candidateId];
    const candidate = CANDIDATE_LOOKUP[candidateId];

    if (!sessionId || !candidate) {
      setStatusMessage(
        "Candidate must be assigned to a session before sending assignment email.",
      );
      return;
    }

    const session = sessionLookup[sessionId];
    if (!session) return;

    const interviewer = interviewerLookup[session.interviewerId];
    const selectedJob = jobLookup[session.jobId];
    const assignmentMessage = applyEmailTemplate(emailTemplates.container2, {
      candidateName: candidate.name,
      sessionName: session.name,
      jobTitle: selectedJob?.title ?? session.jobId,
      interviewerName: interviewer?.name ?? "Interviewer",
      sessionDate: formatHumanDate(session.sessionDate),
      durationMinutes: session.durationMinutes,
    });

    addEmailLogs([
      {
        category: "Assignment",
        recipient: candidate.email,
        subject: `Assignment update: ${session.name}`,
        details: assignmentMessage,
      },
    ]);

    updateSession(session.id, (current) => ({
      ...current,
      lastEmailAt: new Date().toLocaleString(),
    }));

    setStatusMessage(`Assignment email sent to ${candidate.name}.`);
  };

  const handleUpdateActiveCandidate = (
    candidateId: string,
    patch: Partial<SessionCandidate>,
  ) => {
    if (!activeInterviewSession) return;

    updateSession(activeInterviewSession.id, (current) => ({
      ...current,
      candidates: current.candidates.map((candidate) =>
        candidate.candidateId === candidateId
          ? {
              ...candidate,
              ...patch,
            }
          : candidate,
      ),
    }));
  };

  const handleSendScheduleEmails = () => {
    if (!activeInterviewSession) {
      setStatusMessage("Select a session first to send schedule emails.");
      return;
    }

    if (activeInterviewSession.candidates.length === 0) {
      setStatusMessage(
        "No candidates in this session yet. Assign candidates before sending schedule emails.",
      );
      return;
    }

    const interviewer = interviewerLookup[activeInterviewSession.interviewerId];
    const selectedJob = jobLookup[activeInterviewSession.jobId];
    const scheduleForInterviewer = applyEmailTemplate(
      emailTemplates.container3Schedule,
      {
        recipientName: interviewer?.name ?? "Interviewer",
        sessionName: activeInterviewSession.name,
        jobTitle: selectedJob?.title ?? activeInterviewSession.jobId,
        action: "Schedule confirmed",
        slotTime: activeInterviewSession.startTime,
        durationMinutes: activeInterviewSession.durationMinutes,
        resultSummary: `${activeInterviewSession.candidates.length} candidates notified`,
      },
    );
    const scheduleForCandidates = applyEmailTemplate(
      emailTemplates.container3Schedule,
      {
        recipientName: "Candidate",
        sessionName: activeInterviewSession.name,
        jobTitle: selectedJob?.title ?? activeInterviewSession.jobId,
        action: "Interview schedule",
        slotTime: activeInterviewSession.startTime,
        durationMinutes: activeInterviewSession.durationMinutes,
        resultSummary: "Check your exact slot in dashboard",
      },
    );

    addEmailLogs([
      {
        category: "Schedule",
        recipient: interviewer?.email ?? "Interviewer not assigned",
        subject: `${activeInterviewSession.name} schedule confirmed`,
        details: scheduleForInterviewer,
      },
      {
        category: "Schedule",
        recipient: `${activeInterviewSession.candidates.length} candidates in ${activeInterviewSession.name}`,
        subject: `${activeInterviewSession.name} slot schedule`,
        details: scheduleForCandidates,
      },
    ]);

    updateSession(activeInterviewSession.id, (current) => ({
      ...current,
      status: current.status === "Completed" ? "Completed" : "Scheduled",
      lastEmailAt: new Date().toLocaleString(),
    }));

    setStatusMessage(
      `Schedule emails sent for ${activeInterviewSession.name}. Session marked as Scheduled.`,
    );
  };

  const handleSendResultEmails = () => {
    if (!activeInterviewSession) {
      setStatusMessage("Select a session first to send result emails.");
      return;
    }

    const breakdown = getSessionBreakdown(activeInterviewSession);
    const reviewed = breakdown.passed + breakdown.failed + breakdown.onHold;

    if (reviewed === 0) {
      setStatusMessage(
        "Set candidate results before sending outcome emails from container 3.",
      );
      return;
    }

    const interviewer = interviewerLookup[activeInterviewSession.interviewerId];
    const selectedJob = jobLookup[activeInterviewSession.jobId];
    const resultSummary = `${breakdown.passed} passed, ${breakdown.failed} failed, ${breakdown.onHold} on hold, ${breakdown.pending} pending`;
    const resultForInterviewer = applyEmailTemplate(
      emailTemplates.container3Result,
      {
        recipientName: interviewer?.name ?? "Interviewer",
        sessionName: activeInterviewSession.name,
        jobTitle: selectedJob?.title ?? activeInterviewSession.jobId,
        action: "Result publication",
        slotTime: activeInterviewSession.startTime,
        durationMinutes: activeInterviewSession.durationMinutes,
        resultSummary,
      },
    );
    const resultForCandidates = applyEmailTemplate(
      emailTemplates.container3Result,
      {
        recipientName: "Candidate",
        sessionName: activeInterviewSession.name,
        jobTitle: selectedJob?.title ?? activeInterviewSession.jobId,
        action: "Result notification",
        slotTime: "Refer to your slot",
        durationMinutes: activeInterviewSession.durationMinutes,
        resultSummary,
      },
    );

    addEmailLogs([
      {
        category: "Result",
        recipient: interviewer?.email ?? "Interviewer not assigned",
        subject: `${activeInterviewSession.name} result summary`,
        details: resultForInterviewer,
      },
      {
        category: "Result",
        recipient: `${reviewed} candidates in ${activeInterviewSession.name}`,
        subject: `${activeInterviewSession.name} interview outcomes`,
        details: resultForCandidates,
      },
    ]);

    updateSession(activeInterviewSession.id, (current) => ({
      ...current,
      status: breakdown.pending === 0 ? "Completed" : current.status,
      lastEmailAt: new Date().toLocaleString(),
    }));

    setStatusMessage(
      `Result emails sent for ${activeInterviewSession.name}. Reviewed candidates: ${reviewed}.`,
    );
  };

  const handleSendSelectedContainer3Email = () => {
    if (!activeInterviewSession || !container3EmailCandidateId) return;

    const candidate = CANDIDATE_LOOKUP[container3EmailCandidateId];
    const slot = activeInterviewSession.candidates.find(
      (item) => item.candidateId === container3EmailCandidateId,
    );
    const selectedJob = jobLookup[activeInterviewSession.jobId];

    if (!candidate || !slot) return;

    let details = "";
    let recipient = candidate.email;
    let subject = `Reminder: ${activeInterviewSession.name}`;
    let category: EmailCategory = "Reminder";

    if (container3EmailOption === "schedule") {
      details = applyEmailTemplate(emailTemplates.container3Schedule, {
        recipientName: candidate.name,
        sessionName: activeInterviewSession.name,
        jobTitle: selectedJob?.title ?? activeInterviewSession.jobId,
        action: "Schedule",
        slotTime: slot.slotTime || activeInterviewSession.startTime,
        durationMinutes: slot.durationMinutes,
        resultSummary: "Please review your interview timing.",
      });
      recipient = candidate.email;
      subject = `Schedule: ${activeInterviewSession.name}`;
      category = "Schedule";
    } else if (container3EmailOption === "result") {
      details = applyEmailTemplate(emailTemplates.container3Result, {
        recipientName: candidate.name,
        sessionName: activeInterviewSession.name,
        jobTitle: selectedJob?.title ?? activeInterviewSession.jobId,
        action: "Result update",
        slotTime: slot.slotTime || activeInterviewSession.startTime,
        durationMinutes: slot.durationMinutes,
        resultSummary: slot.result,
      });
      recipient = candidate.email;
      subject = `Result Update: ${activeInterviewSession.name}`;
      category = "Result";
    } else {
      details = applyEmailTemplate(emailTemplates.container3Reminder, {
        recipientName: candidate.name,
        sessionName: activeInterviewSession.name,
        jobTitle: selectedJob?.title ?? activeInterviewSession.jobId,
        action: "Reminder",
        slotTime: slot.slotTime || activeInterviewSession.startTime,
        durationMinutes: slot.durationMinutes,
        resultSummary: slot.result,
      });
      recipient = candidate.email;
      subject = `Reminder: ${activeInterviewSession.name}`;
      category = "Reminder";
    }

    addEmailLogs([
      {
        category,
        recipient,
        subject,
        details,
      },
    ]);

    updateSession(activeInterviewSession.id, (current) => ({
      ...current,
      lastEmailAt: new Date().toLocaleString(),
    }));

    setStatusMessage(`${subject} email queued successfully.`);
    setShowContainer3EmailModal(false);
    setContainer3EmailCandidateId(null);
  };

  const handleDownloadCandidateDetails = (
    candidate: Candidate,
    slot: SessionCandidate,
  ) => {
    if (!activeInterviewSession) return;

    const selectedJob = jobLookup[activeInterviewSession.jobId];
    const interviewer = interviewerLookup[activeInterviewSession.interviewerId];

    downloadJsonFile(`${candidate.id}-${activeInterviewSession.id}.json`, {
      generatedAt: new Date().toISOString(),
      candidate,
      session: {
        id: activeInterviewSession.id,
        name: activeInterviewSession.name,
        jobTitle: selectedJob?.title ?? activeInterviewSession.jobId,
        interviewer: interviewer?.name ?? "Unassigned",
        interviewerEmail: interviewer?.email ?? "",
        deadline: activeInterviewSession.deadline,
        sessionDate: activeInterviewSession.sessionDate,
        defaultStartTime: activeInterviewSession.startTime,
        requirements: activeInterviewSession.requirements,
        remarks: activeInterviewSession.remarks,
      },
      interviewSlot: {
        candidateSlotTime: slot.slotTime,
        durationMinutes: slot.durationMinutes,
        result: slot.result,
        notes: slot.notes,
      },
    });

    setStatusMessage(`Candidate packet downloaded for ${candidate.name}.`);
  };

  const activeBreakdown = activeInterviewSession
    ? getSessionBreakdown(activeInterviewSession)
    : { pending: 0, passed: 0, failed: 0, onHold: 0 };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-gray-500">{todayLabel}</p>
        <h1 className="text-3xl font-bold">Interview Session Operations</h1>
        {statusMessage && (
          <p className="mt-2 text-sm text-gray-500">{statusMessage}</p>
        )}
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Sessions</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowCreateSessionModal(true)}
              className="rounded-lg bg-[#5D20B3] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a1a8a]"
            >
              Create Session
            </button>
            <button
              onClick={() => setShowContainer1TemplateModal(true)}
              className="rounded-lg border border-[#5D20B3] px-4 py-2 text-sm font-medium text-[#5D20B3] hover:bg-[#5D20B3]/10"
            >
              Edit Predefined Email
            </button>
          </div>
        </div>

        <div className="max-h-[500px] overflow-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="text-gray-600">
                <th className="px-3 py-3 font-medium">Session</th>
                <th className="px-3 py-3 font-medium">Job</th>
                <th className="px-3 py-3 font-medium">Interviewer</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Candidates</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {sessions.map((session) => {
                const interviewer = interviewerLookup[session.interviewerId];
                const job = jobLookup[session.jobId];

                return (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-900">
                        {session.name}
                      </p>
                      <p className="text-xs text-gray-500">{session.id}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {job?.title ?? session.jobId}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {interviewer?.name ?? "Unassigned"}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {formatHumanDate(session.sessionDate)}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        {session.candidates.length}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                        {session.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleOpenSessionDetails(session.id)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sessions.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              No sessions created yet.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold">
            Candidate List by Job Form and Session Assignment
          </h2>
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Job Filter
            </label>
            <select
              value={candidateJobFilter}
              onChange={(event) => setCandidateJobFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {JOB_FORMS.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Session Filter
            </label>
            <select
              value={resolvedCandidateSessionFilterId}
              onChange={(event) =>
                setCandidateSessionFilterId(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All Sessions</option>
              {sessionsForCandidateJob.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Assignment Filter
            </label>
            <select
              value={candidateAssignmentFilter}
              onChange={(event) =>
                setCandidateAssignmentFilter(
                  event.target.value as AssignmentFilter,
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>

        <div className="max-h-[520px] overflow-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="text-gray-600">
                <th className="px-3 py-3 font-medium">Candidate</th>
                <th className="px-3 py-3 font-medium">Email</th>
                <th className="px-3 py-3 font-medium">Assigned Session</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {filteredCandidates.map((candidate) => {
                const assignedSessionId =
                  assignedSessionByCandidateId[candidate.id] ?? null;
                const assignedSession = assignedSessionId
                  ? sessionLookup[assignedSessionId]
                  : null;
                const isAssigned = Boolean(assignedSessionId);

                return (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-900">
                        {candidate.name}
                      </p>
                      <p className="text-xs text-gray-500">{candidate.id}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {candidate.email}
                    </td>
                    <td className="px-3 py-3">
                      {assignedSession ? (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                          {assignedSession.name}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            handleOpenContainer2Details(candidate.id)
                          }
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() =>
                            isAssigned
                              ? handleSendAssignmentEmailToCandidate(
                                  candidate.id,
                                )
                              : handleOpenAssignModal(candidate.id)
                          }
                          className="rounded-lg bg-[#5D20B3] px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isAssigned ? "Send Email" : "Assign"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCandidates.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              No candidates match your filter.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold">
            Interview Session View, Results, Details, and Downloads
          </h2>
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Job Filter
            </label>
            <select
              value={interviewJobFilter}
              onChange={(event) => setInterviewJobFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {JOB_FORMS.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Session Filter
            </label>
            <select
              value={resolvedInterviewSessionId}
              onChange={(event) => setInterviewSessionId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {sessionsForInterviewJob.length === 0 ? (
                <option value="">No sessions available</option>
              ) : (
                sessionsForInterviewJob.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Search in Session
            </label>
            <input
              value={interviewCandidateSearch}
              onChange={(event) =>
                setInterviewCandidateSearch(event.target.value)
              }
              placeholder="ID, name, email, location"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {activeInterviewSession ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statCard(
                "Active Session",
                activeInterviewSession.name,
                jobLookup[activeInterviewSession.jobId]?.position ?? "",
              )}
              {statCard(
                "Candidates",
                activeInterviewSession.candidates.length,
                "Assigned to this session",
              )}
              {statCard(
                "Pending",
                activeBreakdown.pending,
                "Still waiting for final decision",
              )}
              {statCard(
                "Reviewed",
                activeBreakdown.passed +
                  activeBreakdown.failed +
                  activeBreakdown.onHold,
                "Passed, failed, or on hold",
              )}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={handleConductSession}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Conduct Session
              </button>
              <button
                onClick={handleSendScheduleEmails}
                className="rounded-lg border border-[#5D20B3] px-4 py-2 text-xs font-medium text-[#5D20B3] hover:bg-[#5D20B3]/10"
              >
                Send Schedule Emails
              </button>
              <button
                onClick={handleSendResultEmails}
                className="rounded-lg bg-[#5D20B3] px-4 py-2 text-xs font-medium text-white hover:bg-[#4a1a8a]"
              >
                Send Result Emails
              </button>
              <button
                onClick={() => setShowContainer3TemplateModal(true)}
                className="rounded-lg border border-[#5D20B3] px-4 py-2 text-xs font-medium text-[#5D20B3] hover:bg-[#5D20B3]/10"
              >
                Manage Email Templates
              </button>
            </div>

            <div className="max-h-[560px] overflow-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-gray-600">
                    <th className="px-3 py-3 font-medium">Candidate</th>
                    <th className="px-3 py-3 font-medium">Email</th>
                    <th className="px-3 py-3 font-medium">Time</th>
                    <th className="px-3 py-3 font-medium">Result</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {activeInterviewRows.map(({ candidate, slot }) => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-900">
                          {candidate.name}
                        </p>
                        <p className="text-xs text-gray-500">{candidate.id}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        {candidate.email}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="time"
                          value={slot.slotTime}
                          onChange={(event) =>
                            handleUpdateActiveCandidate(candidate.id, {
                              slotTime: event.target.value,
                            })
                          }
                          className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={slot.result}
                          onChange={(event) =>
                            handleUpdateActiveCandidate(candidate.id, {
                              result: event.target.value as CandidateResult,
                            })
                          }
                          className={`rounded-lg border border-gray-300 px-2 py-1 text-sm ${RESULT_STYLES[slot.result]}`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Passed">Passed</option>
                          <option value="Failed">Failed</option>
                          <option value="On Hold">On Hold</option>
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              handleOpenContainer3Details(candidate.id)
                            }
                            className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            View
                          </button>
                          <button
                            onClick={() =>
                              handleDownloadCandidateDetails(candidate, slot)
                            }
                            className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Download
                          </button>
                          <button
                            onClick={() =>
                              handleOpenContainer3EmailModal(candidate.id)
                            }
                            className="rounded-lg border border-[#5D20B3] px-2 py-1 text-xs font-medium text-[#5D20B3] hover:bg-[#5D20B3]/10"
                          >
                            Email
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {activeInterviewRows.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">
                  No candidates found in this session for your current filter.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            No sessions are available for this job filter. Create one in
            container 1 first.
          </div>
        )}
      </section>

      {showSessionDetailsModal && selectedSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4"
          onClick={() => {
            setShowSessionDetailsModal(false);
            setSelectedSessionId(null);
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-4 text-2xl font-bold">Session Details</h3>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Session Name
                </p>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {selectedSession.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Job
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {jobLookup[selectedSession.jobId]?.title ??
                    selectedSession.jobId}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Interviewer
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {interviewerLookup[selectedSession.interviewerId]?.name ??
                    "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Session Date
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {formatHumanDate(selectedSession.sessionDate)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Deadline
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {formatHumanDate(selectedSession.deadline)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Candidates
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {selectedSession.candidates.length}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Start Time
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {selectedSession.startTime}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Duration
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {selectedSession.durationMinutes} minutes
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Requirements
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {selectedSession.requirements}
              </p>
            </div>

            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Remarks
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {selectedSession.remarks}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleOpenSessionCandidates}
                className="flex-1 rounded-lg bg-[#5D20B3] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a1a8a]"
              >
                View Candidates
              </button>
              <button
                onClick={() => {
                  setShowSessionDetailsModal(false);
                  setSelectedSessionId(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showSessionCandidatesModal && selectedSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4"
          onClick={() => {
            setShowSessionCandidatesModal(false);
            setSelectedSessionId(null);
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-1 text-2xl font-bold">Session Candidates</h3>
            <p className="mb-4 text-sm text-gray-600">
              {selectedSession.name} ({selectedSessionCandidates.length}{" "}
              candidates)
            </p>

            <div className="max-h-[55vh] overflow-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-gray-600">
                    <th className="px-3 py-3 font-medium">Candidate</th>
                    <th className="px-3 py-3 font-medium">Email</th>
                    <th className="px-3 py-3 font-medium">Time</th>
                    <th className="px-3 py-3 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {selectedSessionCandidates.map(({ candidate, slot }) => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-900">
                          {candidate.name}
                        </p>
                        <p className="text-xs text-gray-500">{candidate.id}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        {candidate.email}
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        {slot.slotTime || "Not set"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${RESULT_STYLES[slot.result]}`}
                        >
                          {slot.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedSessionCandidates.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">
                  No candidates assigned yet.
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowSessionCandidatesModal(false);
                  setShowSessionDetailsModal(true);
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => {
                  setShowSessionCandidatesModal(false);
                  setSelectedSessionId(null);
                }}
                className="flex-1 rounded-lg bg-[#5D20B3] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a1a8a]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateSessionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4"
          onClick={() => setShowCreateSessionModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-4 text-2xl font-bold">Create Session</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Job Form
                </label>
                <select
                  value={createForm.jobId}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      jobId: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {JOB_FORMS.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Session Name (optional)
                </label>
                <input
                  value={createForm.sessionName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      sessionName: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Interviewer
                </label>
                <select
                  value={createForm.interviewerId}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      interviewerId: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select interviewer</option>
                  {INTERVIEWERS.map((interviewer) => (
                    <option key={interviewer.id} value={interviewer.id}>
                      {interviewer.name} ({interviewer.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Deadline
                </label>
                <input
                  type="date"
                  value={createForm.deadline}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      deadline: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Session Date
                </label>
                <input
                  type="date"
                  value={createForm.sessionDate}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      sessionDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Start Time
                </label>
                <input
                  type="time"
                  value={createForm.startTime}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      startTime: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={createForm.durationMinutes}
                  onChange={(event) => {
                    const value = Number.parseInt(event.target.value, 10);
                    if (Number.isNaN(value)) return;

                    setCreateForm((current) => ({
                      ...current,
                      durationMinutes: clamp(value, 10, 120),
                    }));
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Requirements
                </label>
                <textarea
                  value={createForm.requirements}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      requirements: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Remarks for Interviewer
                </label>
                <textarea
                  value={createForm.remarks}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      remarks: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCreateSession}
                className="flex-1 rounded-lg bg-[#5D20B3] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a1a8a]"
              >
                Create + Send Session Email
              </button>
              <button
                onClick={() => setShowCreateSessionModal(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showContainer1TemplateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4"
          onClick={() => setShowContainer1TemplateModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-gray-900">
                Container 1 Predefined Email
              </h3>
              <button
                onClick={() => handleSaveTemplate("container1")}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Save Template
              </button>
            </div>
            <p className="mb-2 text-xs text-gray-500">
              Placeholders: interviewerName, sessionName, jobTitle, deadline,
              sessionDate, requirements, remarks
            </p>
            <textarea
              value={emailTemplates.container1}
              onChange={(event) =>
                updateEmailTemplate("container1", event.target.value)
              }
              rows={10}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
            <div className="mt-4">
              <button
                onClick={() => setShowContainer1TemplateModal(false)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showContainer2TemplateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4"
          onClick={() => setShowContainer2TemplateModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-gray-900">
                Container 2 Predefined Email
              </h3>
              <button
                onClick={() => handleSaveTemplate("container2")}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Save Template
              </button>
            </div>
            <p className="mb-2 text-xs text-gray-500">
              Placeholders: candidateName, sessionName, jobTitle,
              interviewerName, sessionDate, durationMinutes
            </p>
            <textarea
              value={emailTemplates.container2}
              onChange={(event) =>
                updateEmailTemplate("container2", event.target.value)
              }
              rows={10}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
            <div className="mt-4">
              <button
                onClick={() => setShowContainer2TemplateModal(false)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showContainer3TemplateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4"
          onClick={() => setShowContainer3TemplateModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-gray-900">
                Predefined Emails
              </h3>
              <button
                onClick={() => handleSaveTemplate(activeContainer3TemplateKey)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Save Template
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Email Type
              </label>
              <select
                value={container3TemplateEditorOption}
                onChange={(event) =>
                  setContainer3TemplateEditorOption(
                    event.target.value as Container3EmailOption,
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="schedule">Schedule</option>
                <option value="result">Result</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>

            <textarea
              value={emailTemplates[activeContainer3TemplateKey]}
              onChange={(event) =>
                updateEmailTemplate(
                  activeContainer3TemplateKey,
                  event.target.value,
                )
              }
              rows={10}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />

            <div className="mt-4">
              <button
                onClick={() => setShowContainer3TemplateModal(false)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showContainer2DetailsModal && container2DetailsCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4"
          onClick={() => {
            setShowContainer2DetailsModal(false);
            setContainer2DetailsCandidateId(null);
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-4 text-2xl font-bold">Candidate Details</h3>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Candidate ID
                </p>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {container2DetailsCandidate.id}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Name
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {container2DetailsCandidate.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Email
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {container2DetailsCandidate.email}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Phone
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {container2DetailsCandidate.phone}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Experience
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {container2DetailsCandidate.experienceYears} years
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Location
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {container2DetailsCandidate.location}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Applied Date
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {formatHumanDate(container2DetailsCandidate.appliedDate)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Assigned Session
                </p>
                <p className="mt-1 text-base text-gray-900">
                  {container2DetailsSession
                    ? `${container2DetailsSession.name} (${formatHumanDate(container2DetailsSession.sessionDate)})`
                    : "Not assigned"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Summary
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {container2DetailsCandidate.summary}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowContainer2DetailsModal(false);
                  setContainer2DetailsCandidateId(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && assignModalCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4"
          onClick={() => {
            setShowAssignModal(false);
            setAssignCandidateId(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900">
              Assign Candidate to Existing Session
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {assignModalCandidate.name} ({assignModalCandidate.id})
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Target Session
                </label>
                <select
                  value={resolvedAssignTargetSessionId}
                  onChange={(event) =>
                    setAssignTargetSessionId(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {assignModalSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name} - {formatHumanDate(session.sessionDate)}
                    </option>
                  ))}
                </select>
              </div>

              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Clicking assign will place the candidate into the selected
                session.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleConfirmAssignAndSendEmail}
                className="flex-1 rounded-lg bg-[#5D20B3] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a1a8a]"
              >
                Assign and Send Email
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignCandidateId(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showContainer3DetailsModal && container3DetailsRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4"
          onClick={() => {
            setShowContainer3DetailsModal(false);
            setContainer3DetailsCandidateId(null);
          }}
        >
          <div
            className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-4 text-2xl font-bold">
              Interview Candidate Details
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Candidate
                </label>
                <p className="text-lg text-gray-900">
                  {container3DetailsRow.candidate.name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Email
                </label>
                <p className="text-lg text-gray-900">
                  {container3DetailsRow.candidate.email}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Phone
                </label>
                <p className="text-lg text-gray-900">
                  {container3DetailsRow.candidate.phone}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Location
                </label>
                <p className="text-lg text-gray-900">
                  {container3DetailsRow.candidate.location}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Slot Time
                </label>
                <input
                  type="time"
                  value={container3DetailSlotTime}
                  onChange={(event) =>
                    setContainer3DetailSlotTime(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={container3DetailDuration}
                  onChange={(event) => {
                    const value = Number.parseInt(event.target.value, 10);
                    if (Number.isNaN(value)) return;
                    setContainer3DetailDuration(clamp(value, 10, 120));
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Result
                </label>
                <select
                  value={container3DetailResult}
                  onChange={(event) =>
                    setContainer3DetailResult(
                      event.target.value as CandidateResult,
                    )
                  }
                  className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${RESULT_STYLES[container3DetailResult]}`}
                >
                  <option value="Pending">Pending</option>
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-600">
                  Remarks / Notes
                </label>
                <textarea
                  value={container3DetailNotes}
                  onChange={(event) =>
                    setContainer3DetailNotes(event.target.value)
                  }
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Add interviewer remarks, observations, or next steps"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSaveContainer3Details}
                className="flex-1 rounded-lg bg-[#5D20B3] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a1a8a]"
              >
                Save Details
              </button>
              <button
                onClick={() => {
                  setShowContainer3DetailsModal(false);
                  setContainer3DetailsCandidateId(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showContainer3EmailModal && container3EmailRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4"
          onClick={() => {
            setShowContainer3EmailModal(false);
            setContainer3EmailCandidateId(null);
          }}
        >
          <div
            className="w-full max-w-xl rounded-xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900">
              Select Predefined Email Type
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Candidate: {container3EmailRow.candidate.name} (
              {container3EmailRow.candidate.id})
            </p>

            <div className="mt-4 space-y-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="container3-email-type"
                  checked={container3EmailOption === "schedule"}
                  onChange={() => setContainer3EmailOption("schedule")}
                />
                Schedule
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="container3-email-type"
                  checked={container3EmailOption === "result"}
                  onChange={() => setContainer3EmailOption("result")}
                />
                Result Update
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="container3-email-type"
                  checked={container3EmailOption === "reminder"}
                  onChange={() => setContainer3EmailOption("reminder")}
                />
                Reminder
              </label>
            </div>

            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-gray-600">
                Template Preview
              </p>
              <textarea
                value={
                  emailTemplates[
                    CONTAINER3_TEMPLATE_KEYS[container3EmailOption]
                  ]
                }
                readOnly
                rows={6}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSendSelectedContainer3Email}
                className="flex-1 rounded-lg bg-[#5D20B3] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a1a8a]"
              >
                Send Selected Email
              </button>
              <button
                onClick={() => {
                  setContainer3TemplateEditorOption(container3EmailOption);
                  setShowContainer3EmailModal(false);
                  setShowContainer3TemplateModal(true);
                }}
                className="flex-1 rounded-lg border border-[#5D20B3] px-4 py-2 text-sm font-medium text-[#5D20B3] hover:bg-[#5D20B3]/10"
              >
                Edit Template
              </button>
              <button
                onClick={() => {
                  setShowContainer3EmailModal(false);
                  setContainer3EmailCandidateId(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
