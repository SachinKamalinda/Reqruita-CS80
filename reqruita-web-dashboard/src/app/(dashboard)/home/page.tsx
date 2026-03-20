"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchSettings,
  fetchSessionsBootstrap,
  getAllJobForms,
  getFormSubmissions,
} from "@/lib/api";

interface SessionOverview {
  id: string;
  name: string;
  jobTitle: string;
  date: string;
  candidateCount: number;
  status: string;
}

interface SubmissionOverview {
  id: string;
  formTitle: string;
  submitterEmail: string;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  activeForms: number;
  totalSubmissions: number;
  totalSessions: number;
  assignedCandidates: number;
}

const DEFAULT_UNKNOWN_EMAIL = "unknown@example.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const formatDateLabel = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toDateScore = (value: string): number => {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

const normalizePotentialEmail = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
};

const getSubmissionEntries = (
  submittedData: unknown,
): Array<[string, unknown]> => {
  if (submittedData instanceof Map) {
    return Array.from(submittedData.entries());
  }

  if (submittedData && typeof submittedData === "object") {
    return Object.entries(submittedData as Record<string, unknown>);
  }

  return [];
};

const resolveSubmissionEmail = (submission: {
  submitterEmail?: string;
  submittedData?: unknown;
}): string => {
  const directEmail = normalizePotentialEmail(submission.submitterEmail);
  if (directEmail && directEmail !== DEFAULT_UNKNOWN_EMAIL) {
    return directEmail;
  }

  const submittedEntries = getSubmissionEntries(submission.submittedData);

  const fromNamedEmailField = submittedEntries
    .map(([key, value]) => ({
      key: key.toLowerCase(),
      email: normalizePotentialEmail(value),
    }))
    .find(
      (entry) =>
        !!entry.email &&
        entry.key.includes("email") &&
        entry.email !== DEFAULT_UNKNOWN_EMAIL,
    )?.email;

  if (fromNamedEmailField) {
    return fromNamedEmailField;
  }

  const inferredEmail = submittedEntries
    .map(([, value]) => normalizePotentialEmail(value))
    .find(
      (email): email is string => !!email && email !== DEFAULT_UNKNOWN_EMAIL,
    );

  if (inferredEmail) {
    return inferredEmail;
  }

  return directEmail || DEFAULT_UNKNOWN_EMAIL;
};

const getSessionStatusClasses = (status: string): string => {
  const normalized = status.toLowerCase();

  if (normalized === "scheduled") {
    return "bg-blue-100 text-blue-800";
  }

  if (normalized === "completed") {
    return "bg-green-100 text-green-800";
  }

  return "bg-yellow-100 text-yellow-800";
};

const getSubmissionStatusClasses = (status: string): string => {
  const normalized = status.toLowerCase();

  if (normalized === "accepted") {
    return "bg-green-100 text-green-800";
  }

  if (normalized === "rejected") {
    return "bg-red-100 text-red-800";
  }

  if (normalized === "reviewed") {
    return "bg-blue-100 text-blue-800";
  }

  return "bg-yellow-100 text-yellow-800";
};

export default function Dashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionOverview[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionOverview[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeForms: 0,
    totalSubmissions: 0,
    totalSessions: 0,
    assignedCandidates: 0,
  });
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [settingsResult, sessionsResult, formsResult] =
          await Promise.allSettled([
            fetchSettings(),
            fetchSessionsBootstrap(),
            getAllJobForms(),
          ]);

        if (!isMounted) {
          return;
        }

        if (settingsResult.status === "fulfilled") {
          setUserName(settingsResult.value.firstName || "User");
        }

        if (sessionsResult.status === "fulfilled") {
          const sessionsData = sessionsResult.value;
          const jobsById = new Map(
            sessionsData.jobs.map((job) => [
              job.id,
              job.title || job.jobRole || "Interview Session",
            ]),
          );

          const upcomingSessions = sessionsData.sessions
            .filter((session) => session.status !== "Completed")
            .sort(
              (a, b) => toDateScore(a.sessionDate) - toDateScore(b.sessionDate),
            )
            .slice(0, 5)
            .map((session) => ({
              id: session.id,
              name: session.name,
              jobTitle: jobsById.get(session.jobId) || "Interview Session",
              date: formatDateLabel(session.sessionDate),
              candidateCount: session.candidates?.length || 0,
              status: session.status,
            }));

          setSessions(upcomingSessions);
          setStats((prev) => ({
            ...prev,
            totalSessions: sessionsData.sessions.length,
            assignedCandidates: sessionsData.sessions.reduce(
              (count, session) => count + (session.candidates?.length || 0),
              0,
            ),
          }));
        } else {
          setSessions([]);
        }

        if (formsResult.status === "fulfilled") {
          const formsData = formsResult.value;

          setStats((prev) => ({
            ...prev,
            activeForms: formsData.forms.filter((form) => form.isActive).length,
            totalSubmissions: formsData.forms.reduce(
              (count, form) => count + (form.submissionCount || 0),
              0,
            ),
          }));

          const submissionsByForm = await Promise.allSettled(
            formsData.forms.map(async (form) => {
              const submissionsData = await getFormSubmissions(form._id, {
                sortBy: "latest",
                page: 1,
                limit: 5,
              });

              return submissionsData.submissions.map((submission) => ({
                id: submission._id,
                formTitle: form.title,
                submitterEmail: resolveSubmissionEmail(submission),
                status: submission.status || "submitted",
                createdAt: submission.createdAt,
              }));
            }),
          );

          if (!isMounted) {
            return;
          }

          const mergedSubmissions = submissionsByForm
            .flatMap((result) =>
              result.status === "fulfilled" ? result.value : [],
            )
            .sort((a, b) => toDateScore(b.createdAt) - toDateScore(a.createdAt))
            .slice(0, 5);

          setSubmissions(mergedSubmissions);
        } else {
          setSubmissions([]);
        }

        if (
          settingsResult.status === "rejected" ||
          sessionsResult.status === "rejected" ||
          formsResult.status === "rejected"
        ) {
          setError("Some dashboard data could not be loaded.");
        }
      } catch (loadError) {
        console.error("Error loading dashboard:", loadError);
        if (isMounted) {
          setError("Failed to load dashboard data.");
          setSessions([]);
          setSubmissions([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    const intervalId = setInterval(loadData, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="grid gap-8">
      <div className="space-y-8">
        <div>
          <p className="text-gray-500">{todayLabel}</p>
          <h1 className="text-3xl font-bold">Good day, {userName}!</h1>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Active Job Forms
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats.activeForms}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Total Submissions
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalSubmissions}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Interview Sessions
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats.totalSessions}
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Assigned Candidates
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats.assignedCandidates}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-6 min-h-[200px]">
          <h2 className="text-xl font-bold mb-6">Upcoming Sessions</h2>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600" />
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{session.name}</p>
                      <p className="text-sm text-gray-500">
                        {session.jobTitle}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {session.date} - {session.candidateCount} candidates
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push("/sessions")}
                        className="text-sm font-medium text-[#5D20B3] bg-purple-100 px-3 py-1 rounded-full hover:bg-purple-200 transition"
                      >
                        View Session
                      </button>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${getSessionStatusClasses(session.status)}`}
                      >
                        {session.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              No upcoming sessions. Create one in the Sessions page.
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">
              Recent Job Application Submissions
            </h2>
            <button
              onClick={() => router.push("/job-forms")}
              className="text-[#5D20B3] text-sm font-medium hover:underline"
            >
              View All &gt;
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-400 border-b">
                  <th className="py-3 font-medium">Form</th>
                  <th className="py-3 font-medium">Email</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium">Submitted</th>
                  <th className="py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {submissions.length > 0 ? (
                  submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="py-4">{submission.formTitle}</td>
                      <td className="py-4 text-purple-600">
                        {submission.submitterEmail}
                      </td>
                      <td className="py-4">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${getSubmissionStatusClasses(submission.status)}`}
                        >
                          {submission.status}
                        </span>
                      </td>
                      <td className="py-4">
                        {formatDateLabel(submission.createdAt)}
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => router.push("/job-forms")}
                          className="bg-[#5D20B3] text-white px-3 py-1 rounded text-xs hover:bg-[#4a1a8a]"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No submissions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
