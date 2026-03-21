"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  assignCandidateToSession,
  conductInterviewSession,
  createInterviewSession,
  fetchSessionCandidatePacket,
  fetchSessionsBootstrap,
  sendAssignmentEmailToCandidate as sendAssignmentEmailToCandidateRequest,
  sendSessionCandidateEmail,
  sendSessionResultEmails,
  sendSessionScheduleEmails,
  updateSessionCandidateDetails,
  updateSessionEmailTemplate,
} from "@/lib/api";

type CandidateResult = "Pending" | "Passed" | "Failed" | "On Hold";

type SessionStatus = "Draft" | "Scheduled" | "Completed";

interface JobFormField {
  label: string;
  type: string;
  required?: boolean;
  order?: number;
}

interface JobForm {
  id: string;
  title: string;
  description: string;
  jobRole: string;
  position: string;
  fields: JobFormField[];
  applicants: number;
}

interface Interviewer {
  id: string;
  name: string;
  email: string;
  role: string;
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
  meetingId: string;
  meetingPassword: string;
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
  id: string;
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

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

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

const getToastTone = (message: string): ToastTone => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("unable") ||
    normalized.includes("invalid") ||
    normalized.includes("required") ||
    normalized.includes("select") ||
    normalized.includes("must") ||
    normalized.includes("not found") ||
    normalized.includes("denied")
  ) {
    return "error";
  }

  if (
    normalized.includes("saved") ||
    normalized.includes("created") ||
    normalized.includes("updated") ||
    normalized.includes("sent") ||
    normalized.includes("started") ||
    normalized.includes("downloaded") ||
    normalized.includes("queued")
  ) {
    return "success";
  }

  return "info";
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Request failed. Please try again.";
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
  const [jobs, setJobs] = useState<JobForm[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [candidatePool, setCandidatePool] = useState<
    Record<string, Candidate[]>
  >({});
  const [candidateLookup, setCandidateLookup] = useState<
    Record<string, Candidate>
  >({});
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplates>(
    DEFAULT_EMAIL_TEMPLATES,
  );
  const [savedEmailTemplates, setSavedEmailTemplates] =
    useState<EmailTemplates>(DEFAULT_EMAIL_TEMPLATES);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [statusMessage, setStatusMessageState] = useState<string>("Ready.");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [createForm, setCreateForm] = useState<CreateSessionForm>({
    jobId: "",
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

  const [candidateJobFilter, setCandidateJobFilter] = useState<string>("");
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

  const [interviewJobFilter, setInterviewJobFilter] = useState<string>("");
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
  const [showContainer3SessionInfoModal, setShowContainer3SessionInfoModal] =
    useState<boolean>(false);
  const [container3EmailCandidateId, setContainer3EmailCandidateId] = useState<
    string | null
  >(null);
  const [container3EmailOption, setContainer3EmailOption] =
    useState<Container3EmailOption>("reminder");

  const setStatusMessage = useCallback((message: string) => {
    setStatusMessageState(message);

    if (!message || message === "Ready.") return;

    const id = Date.now() + Math.floor(Math.random() * 1000);
    const tone = getToastTone(message);

    setToasts((current) => [{ id, message, tone }, ...current].slice(0, 4));

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const refreshSessionsData = useCallback(async () => {
    try {
      const data = await fetchSessionsBootstrap();

      const nextPool: Record<string, Candidate[]> = data.jobs.reduce(
        (accumulator, job) => {
          accumulator[job.id] = [];
          return accumulator;
        },
        {} as Record<string, Candidate[]>,
      );

      const nextLookup = data.candidates.reduce<Record<string, Candidate>>(
        (accumulator, candidate) => {
          accumulator[candidate.id] = candidate;
          if (!nextPool[candidate.jobId]) {
            nextPool[candidate.jobId] = [];
          }
          nextPool[candidate.jobId].push(candidate);
          return accumulator;
        },
        {},
      );

      Object.keys(nextPool).forEach((jobId) => {
        nextPool[jobId] = [...nextPool[jobId]].sort((a, b) =>
          a.id.localeCompare(b.id),
        );
      });

      setJobs(data.jobs);
      setInterviewers(data.interviewers);
      setCandidatePool(nextPool);
      setCandidateLookup(nextLookup);
      setSessions(data.sessions as InterviewSession[]);
      const nextTemplates = data.emailTemplates as EmailTemplates;

      setEmailTemplates(nextTemplates);
      setSavedEmailTemplates(nextTemplates);
      setEmailLogs(data.emailLogs as EmailLog[]);

      const firstJobId = data.jobs[0]?.id ?? "";
      const firstInterviewerId = data.interviewers[0]?.id ?? "";
      const jobExists = (jobId: string) =>
        data.jobs.some((job) => job.id === jobId);
      const interviewerExists = (interviewerId: string) =>
        data.interviewers.some(
          (interviewer) => interviewer.id === interviewerId,
        );

      setCreateForm((current) => ({
        ...current,
        jobId:
          current.jobId && jobExists(current.jobId)
            ? current.jobId
            : firstJobId,
        interviewerId:
          current.interviewerId && interviewerExists(current.interviewerId)
            ? current.interviewerId
            : firstInterviewerId,
      }));
      setCandidateJobFilter((current) =>
        current && jobExists(current) ? current : firstJobId,
      );
      setInterviewJobFilter((current) =>
        current && jobExists(current) ? current : firstJobId,
      );
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  }, [setStatusMessage]);

  useEffect(() => {
    const load = async () => {
      setIsLoadingData(true);
      await refreshSessionsData();
      setIsLoadingData(false);
    };

    void load();
  }, [refreshSessionsData]);

  const jobLookup = useMemo(
    () =>
      jobs.reduce<Record<string, JobForm>>((accumulator, job) => {
        accumulator[job.id] = job;
        return accumulator;
      }, {}),
    [jobs],
  );

  const interviewerLookup = useMemo(
    () =>
      interviewers.reduce<Record<string, Interviewer>>(
        (accumulator, person) => {
          accumulator[person.id] = person;
          return accumulator;
        },
        {},
      ),
    [interviewers],
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
        const candidate = candidateLookup[slot.candidateId];
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
  }, [selectedSession, candidateLookup]);

  const activeContainer3TemplateKey = useMemo(
    () => CONTAINER3_TEMPLATE_KEYS[container3TemplateEditorOption],
    [container3TemplateEditorOption],
  );

  const hasUnsavedTemplate = useCallback(
    (templateKey: EmailTemplateKey) =>
      (emailTemplates[templateKey] ?? "") !==
      (savedEmailTemplates[templateKey] ?? ""),
    [emailTemplates, savedEmailTemplates],
  );

  const activeContainer3HasUnsaved = useMemo(
    () => hasUnsavedTemplate(activeContainer3TemplateKey),
    [activeContainer3TemplateKey, hasUnsavedTemplate],
  );

  const assignModalCandidate = useMemo(
    () =>
      assignCandidateId ? (candidateLookup[assignCandidateId] ?? null) : null,
    [assignCandidateId, candidateLookup],
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
        ? (candidateLookup[container2DetailsCandidateId] ?? null)
        : null,
    [container2DetailsCandidateId, candidateLookup],
  );

  const container2DetailsSession = useMemo(() => {
    if (!container2DetailsCandidate) return null;

    const assignedSessionId =
      assignedSessionByCandidateId[container2DetailsCandidate.id];
    if (!assignedSessionId) return null;

    return sessionLookup[assignedSessionId] ?? null;
  }, [container2DetailsCandidate, assignedSessionByCandidateId, sessionLookup]);

  const filteredCandidates = useMemo(() => {
    const candidatesForJob = candidatePool[candidateJobFilter] ?? [];

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
    candidatePool,
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

  const activeInterviewInterviewer = useMemo(() => {
    if (!activeInterviewSession) return null;
    return interviewerLookup[activeInterviewSession.interviewerId] ?? null;
  }, [activeInterviewSession, interviewerLookup]);

  const activeInterviewJob = useMemo(() => {
    if (!activeInterviewSession) return null;
    return jobLookup[activeInterviewSession.jobId] ?? null;
  }, [activeInterviewSession, jobLookup]);

  const activeInterviewRows = useMemo(() => {
    if (!activeInterviewSession) return [];

    const query = interviewCandidateSearch.trim().toLowerCase();

    return activeInterviewSession.candidates
      .map((slot) => {
        const candidate = candidateLookup[slot.candidateId];
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
  }, [activeInterviewSession, interviewCandidateSearch, candidateLookup]);

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

  const replaceSession = (updatedSession: InterviewSession) => {
    setSessions((previous) =>
      previous.map((session) =>
        session.id === updatedSession.id ? updatedSession : session,
      ),
    );
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

  const handleSaveTemplate = async (container: EmailTemplateKey) => {
    try {
      const response = await updateSessionEmailTemplate(
        container,
        emailTemplates[container],
      );
      const nextTemplates = response.emailTemplates as EmailTemplates;

      setEmailTemplates(nextTemplates);
      setSavedEmailTemplates(nextTemplates);
      setStatusMessage(response.message);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
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

  const handleConductSession = async () => {
    if (!activeInterviewSession) {
      setStatusMessage("Select a valid session first.");
      return;
    }

    try {
      const response = await conductInterviewSession(activeInterviewSession.id);
      replaceSession(response.session as InterviewSession);
      setStatusMessage(response.message);
      await refreshSessionsData();
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleOpenContainer2Details = (candidateId: string) => {
    setContainer2DetailsCandidateId(candidateId);
    setShowContainer2DetailsModal(true);
  };

  const handleOpenAssignModal = (candidateId: string) => {
    const candidate = candidateLookup[candidateId];

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

  const handleConfirmAssignAndSendEmail = async () => {
    if (!assignCandidateId || !resolvedAssignTargetSessionId) {
      setStatusMessage("Select a valid session before assigning.");
      return;
    }

    const succeeded = await handleAssignCandidate(
      assignCandidateId,
      resolvedAssignTargetSessionId,
    );

    if (succeeded) {
      setShowAssignModal(false);
      setAssignCandidateId(null);
    }
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

  const handleSaveContainer3Details = async () => {
    if (!container3DetailsCandidateId) return;

    const updated = await handleUpdateActiveCandidate(
      container3DetailsCandidateId,
      {
        slotTime: container3DetailSlotTime,
        durationMinutes: clamp(container3DetailDuration, 10, 120),
        result: container3DetailResult,
        notes: container3DetailNotes,
      },
    );

    if (updated) {
      setStatusMessage("Candidate interview details updated.");
      setShowContainer3DetailsModal(false);
    }
  };

  const handleOpenContainer3EmailModal = (candidateId: string) => {
    setContainer3EmailCandidateId(candidateId);
    setContainer3EmailOption("reminder");
    setShowContainer3EmailModal(true);
  };

  const handleCreateSession = async () => {
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

    try {
      const response = await createInterviewSession({
        ...createForm,
        durationMinutes: clamp(createForm.durationMinutes, 10, 120),
      });

      setCandidateJobFilter(createForm.jobId);
      setCandidateSessionFilterId("all");
      setInterviewJobFilter(createForm.jobId);
      setInterviewSessionId(response.session.id);

      setCreateForm((current) => ({
        ...current,
        sessionName: "",
      }));

      setStatusMessage(response.message);
      setShowCreateSessionModal(false);
      await refreshSessionsData();
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleAssignCandidate = (
    candidateId: string,
    targetSessionId: string,
  ): Promise<boolean> => {
    const targetSession = sessionLookup[targetSessionId];
    const candidate = candidateLookup[candidateId];

    if (!targetSession || !candidate) {
      setStatusMessage(
        "Unable to assign candidate. Try selecting the session again.",
      );
      return Promise.resolve(false);
    }

    if (targetSession.jobId !== candidate.jobId) {
      setStatusMessage(
        "Candidate can only be assigned to sessions under the same job form.",
      );
      return Promise.resolve(false);
    }

    return assignCandidateToSession({ candidateId, targetSessionId })
      .then(async (response) => {
        replaceSession(response.session as InterviewSession);
        setStatusMessage(response.message);
        await refreshSessionsData();
        return true;
      })
      .catch((error) => {
        setStatusMessage(getErrorMessage(error));
        return false;
      });
  };

  const handleSendAssignmentEmailToCandidate = async (candidateId: string) => {
    const sessionId = assignedSessionByCandidateId[candidateId];
    const candidate = candidateLookup[candidateId];

    if (!sessionId || !candidate) {
      setStatusMessage(
        "Candidate must be assigned to a session before sending assignment email.",
      );
      return;
    }

    try {
      const response = await sendAssignmentEmailToCandidateRequest(candidateId);
      replaceSession(response.session as InterviewSession);
      setStatusMessage(response.message);
      await refreshSessionsData();
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleUpdateActiveCandidate = (
    candidateId: string,
    patch: Partial<SessionCandidate>,
  ): Promise<boolean> => {
    if (!activeInterviewSession) return Promise.resolve(false);

    const activeSessionId = activeInterviewSession.id;

    updateSession(activeSessionId, (current) => ({
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

    return updateSessionCandidateDetails(activeSessionId, candidateId, patch)
      .then((response) => {
        replaceSession(response.session as InterviewSession);
        return true;
      })
      .catch(async (error) => {
        setStatusMessage(getErrorMessage(error));
        await refreshSessionsData();
        return false;
      });
  };

  const handleSendScheduleEmails = async () => {
    if (!activeInterviewSession) {
      setStatusMessage("Select a session first to send schedule emails.");
      return;
    }

    try {
      const response = await sendSessionScheduleEmails(
        activeInterviewSession.id,
      );
      replaceSession(response.session as InterviewSession);
      setStatusMessage(response.message);
      await refreshSessionsData();
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleSendResultEmails = async () => {
    if (!activeInterviewSession) {
      setStatusMessage("Select a session first to send result emails.");
      return;
    }

    try {
      const response = await sendSessionResultEmails(activeInterviewSession.id);
      replaceSession(response.session as InterviewSession);
      setStatusMessage(response.message);
      await refreshSessionsData();
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleSendSelectedContainer3Email = async () => {
    if (!activeInterviewSession || !container3EmailCandidateId) return;

    try {
      const response = await sendSessionCandidateEmail(
        activeInterviewSession.id,
        {
          candidateId: container3EmailCandidateId,
          emailOption: container3EmailOption,
        },
      );

      replaceSession(response.session as InterviewSession);
      setStatusMessage(response.message);
      setShowContainer3EmailModal(false);
      setContainer3EmailCandidateId(null);
      await refreshSessionsData();
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleDownloadCandidateDetails = (candidate: Candidate) => {
    if (!activeInterviewSession) return;

    void (async () => {
      try {
        const packet = await fetchSessionCandidatePacket(
          activeInterviewSession.id,
          candidate.id,
        );
        downloadJsonFile(
          `${candidate.id}-${activeInterviewSession.id}.json`,
          packet,
        );
        setStatusMessage(`Candidate packet downloaded for ${candidate.name}.`);
      } catch (error) {
        setStatusMessage(getErrorMessage(error));
      }
    })();
  };

  const activeBreakdown = activeInterviewSession
    ? getSessionBreakdown(activeInterviewSession)
    : { pending: 0, passed: 0, failed: 0, onHold: 0 };

  return (
    <div className="space-y-8">
      <div className="pointer-events-none fixed right-4 top-4 z-[60] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex min-w-[320px] max-w-[420px] items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm shadow-lg ${
              toast.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : toast.tone === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            <p className="leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() =>
                setToasts((current) =>
                  current.filter((item) => item.id !== toast.id),
                )
              }
              className="rounded px-1 text-xs font-medium opacity-70 hover:opacity-100"
            >
              Close
            </button>
          </div>
        ))}
      </div>

      <div>
        <p className="text-gray-500">{todayLabel}</p>
        <h1 className="text-3xl font-bold">Interview Session Operations</h1>
        {isLoadingData && (
          <p className="mt-1 text-sm text-gray-500">Loading session data...</p>
        )}
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
              {jobs.map((job) => (
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
              {jobs.map((job) => (
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

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCard(
            "Active Session",
            activeInterviewSession?.name ?? "No session selected",
            activeInterviewSession
              ? (jobLookup[activeInterviewSession.jobId]?.position ?? "")
              : "Select a session to view details",
          )}
          {statCard(
            "Candidates",
            activeInterviewSession?.candidates.length ?? 0,
            "Assigned to this session",
          )}
          {statCard(
            "Pending",
            activeInterviewSession ? activeBreakdown.pending : 0,
            "Still waiting for final decision",
          )}
          {statCard(
            "Reviewed",
            activeInterviewSession
              ? activeBreakdown.passed +
                  activeBreakdown.failed +
                  activeBreakdown.onHold
              : 0,
            "Passed, failed, or on hold",
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={handleConductSession}
            disabled={!activeInterviewSession}
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            Conduct Session
          </button>
          <button
            onClick={handleSendScheduleEmails}
            disabled={!activeInterviewSession}
            className="rounded-lg border border-[#5D20B3] px-4 py-2 text-xs font-medium text-[#5D20B3] hover:bg-[#5D20B3]/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            Send Schedule Emails
          </button>
          <button
            onClick={handleSendResultEmails}
            disabled={!activeInterviewSession}
            className="rounded-lg bg-[#5D20B3] px-4 py-2 text-xs font-medium text-white hover:bg-[#4a1a8a] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#5D20B3]"
          >
            Send Result Emails
          </button>
          <button
            onClick={() => setShowContainer3TemplateModal(true)}
            className="rounded-lg border border-[#5D20B3] px-4 py-2 text-xs font-medium text-[#5D20B3] hover:bg-[#5D20B3]/10"
          >
            Manage Email Templates
          </button>
          <button
            onClick={() => setShowContainer3SessionInfoModal(true)}
            disabled={!activeInterviewSession}
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            See Session Info
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
                  <td className="px-3 py-3 text-gray-700">{candidate.email}</td>
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
                          handleDownloadCandidateDetails(candidate)
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

          {!activeInterviewSession ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No sessions are available for this job filter. Create one in
              container 1 first.
            </div>
          ) : activeInterviewRows.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No candidates found in this session for your current filter.
            </div>
          ) : null}
        </div>
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
                  {jobs.map((job) => (
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
                  {interviewers.map((interviewer) => (
                    <option key={interviewer.id} value={interviewer.id}>
                      {interviewer.name} (
                      {interviewer.role === "admin"
                        ? "Admin"
                        : interviewer.specialty}
                      )
                    </option>
                  ))}
                </select>
                {interviewers.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    No active interviewer/admin found in User & Roles for your
                    company.
                  </p>
                )}
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
                disabled={!hasUnsavedTemplate("container1")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  hasUnsavedTemplate("container1")
                    ? "border border-[#5D20B3] bg-[#5D20B3] text-white hover:bg-[#4a1a8a]"
                    : "border border-gray-300 bg-white text-gray-500"
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {hasUnsavedTemplate("container1") ? "Save Edits" : "Saved"}
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
                disabled={!hasUnsavedTemplate("container2")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  hasUnsavedTemplate("container2")
                    ? "border border-[#5D20B3] bg-[#5D20B3] text-white hover:bg-[#4a1a8a]"
                    : "border border-gray-300 bg-white text-gray-500"
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {hasUnsavedTemplate("container2") ? "Save Edits" : "Saved"}
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
                disabled={!activeContainer3HasUnsaved}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeContainer3HasUnsaved
                    ? "border border-[#5D20B3] bg-[#5D20B3] text-white hover:bg-[#4a1a8a]"
                    : "border border-gray-300 bg-white text-gray-500"
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {activeContainer3HasUnsaved ? "Save Edits" : "Saved"}
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

      {showContainer3SessionInfoModal && activeInterviewSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4"
          onClick={() => setShowContainer3SessionInfoModal(false)}
        >
          <div
            className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900">Session Info</h3>
            <p className="mt-1 text-sm text-gray-600">
              Use these credentials to join this interview session.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Meeting ID
                </p>
                <p className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900">
                  {activeInterviewSession.meetingId}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Meeting Password
                </p>
                <p className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900">
                  {activeInterviewSession.meetingPassword}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Session Name
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {activeInterviewSession.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Job Form
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {activeInterviewJob?.title ?? "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Interviewer
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {activeInterviewInterviewer?.name ?? "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Session Date
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatHumanDate(activeInterviewSession.sessionDate)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Start Time
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {activeInterviewSession.startTime}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Job Role
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {activeInterviewJob?.jobRole ||
                    activeInterviewJob?.position ||
                    "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Duration
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {activeInterviewSession.durationMinutes} minutes
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Job Form Description
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                {activeInterviewJob?.description?.trim() ||
                  "No job form description available."}
              </p>
            </div>

            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Session Requirements
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                {activeInterviewSession.requirements ||
                  "No requirements recorded."}
              </p>
            </div>

            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Session Remarks
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                {activeInterviewSession.remarks || "No remarks recorded."}
              </p>
            </div>

            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Job Form Fields
              </p>
              {activeInterviewJob?.fields?.length ? (
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  {activeInterviewJob.fields
                    .slice()
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((field, index) => (
                      <li key={`${field.label}-${index}`}>
                        {field.label} ({field.type}) {field.required ? "*" : ""}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-gray-700">
                  No custom form fields found.
                </p>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowContainer3SessionInfoModal(false)}
                className="w-full rounded-lg bg-[#5D20B3] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a1a8a]"
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
