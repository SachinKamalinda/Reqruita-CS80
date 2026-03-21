export const AUTH_API_BASE =
  process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:3003";
const USER_STORAGE_KEY = "reqruita_user";
export const USER_UPDATED_EVENT = "reqruita:user-updated";

export interface AuthUser {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  country?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export interface ApiError {
  message: string;
  error?: string;
}

export interface MessageResponse {
  message: string;
}

export type CandidateResult = 'Pending' | 'Passed' | 'Failed' | 'On Hold';
export type SessionStatus = 'Draft' | 'Scheduled' | 'Completed';
export type EmailCategory =
  | 'Session'
  | 'Assignment'
  | 'Schedule'
  | 'Result'
  | 'Reminder';

export interface SessionJobForm {
  id: string;
  title: string;
  description: string;
  jobRole: string;
  position: string;
  fields: FormField[];
  applicants: number;
}

export interface SessionInterviewer {
  id: string;
  name: string;
  email: string;
  role: string;
  specialty: string;
}

export interface SessionCandidate {
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

export interface SessionCandidateSlot {
  candidateId: string;
  slotTime: string;
  durationMinutes: number;
  result: CandidateResult;
  notes: string;
}

export interface InterviewSession {
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
  candidates: SessionCandidateSlot[];
  lastEmailAt: string | null;
}

export type SessionEmailTemplateKey =
  | 'container1'
  | 'container2'
  | 'container3Schedule'
  | 'container3Result'
  | 'container3Reminder';

export type SessionEmailTemplates = Record<SessionEmailTemplateKey, string>;

export interface SessionEmailLog {
  id: string;
  sentAt: string;
  category: EmailCategory;
  recipient: string;
  subject: string;
  details: string;
}

export interface SessionsBootstrapResponse {
  jobs: SessionJobForm[];
  interviewers: SessionInterviewer[];
  candidates: SessionCandidate[];
  sessions: InterviewSession[];
  emailTemplates: SessionEmailTemplates;
  emailLogs: SessionEmailLog[];
}

export interface CreateSessionPayload {
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

export interface SessionWithMessageResponse {
  message: string;
  session: InterviewSession;
}

export interface AssignCandidatePayload {
  candidateId: string;
  targetSessionId: string;
}

export interface SendCandidateEmailPayload {
  candidateId: string;
  emailOption: 'schedule' | 'result' | 'reminder';
}

export interface UpdateSessionCandidatePayload {
  slotTime?: string;
  durationMinutes?: number;
  result?: CandidateResult;
  notes?: string;
}

export interface UpdateSessionPayload {
  interviewerId?: string;
  requirements?: string;
  remarks?: string;
}

export interface SessionCandidatePacket {
  generatedAt: string;
  candidate: SessionCandidate;
  session: {
    id: string;
    name: string;
    jobTitle: string;
    jobForm?: {
      id: string;
      title: string;
      description: string;
      jobRole: string;
      fields: FormField[];
    };
    interviewer: string;
    interviewerEmail: string;
    meetingId: string;
    meetingPassword: string;
    deadline: string;
    sessionDate: string;
    defaultStartTime: string;
    requirements: string;
    remarks: string;
  };
  interviewSlot: {
    candidateSlotTime: string;
    durationMinutes: number;
    result: CandidateResult;
    notes: string;
  };
}

// ── Token helpers ────────────────────────────────────────────────────────────

export function saveToken(token: string): void {
  localStorage.setItem("reqruita_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("reqruita_token");
}

export function removeToken(): void {
  localStorage.removeItem("reqruita_token");
  localStorage.removeItem(USER_STORAGE_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(USER_UPDATED_EVENT, { detail: null }));
  }
}

export function saveUser(user: AuthUser): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(USER_UPDATED_EVENT, { detail: user }));
  }
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function authedJsonRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new Error('You are not authenticated. Please sign in again.');
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${AUTH_API_BASE}${path}`, {
    ...init,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      removeToken();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/signin')) {
        window.location.href = '/signin';
      }
    }
    throw new Error((data as ApiError).message || 'Request failed');
  }

  return data as T;
}

// ── Auth API calls ───────────────────────────────────────────────────────────

export interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
  companyName?: string;
  industry?: string;
  country?: string;
  address?: string;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_API_BASE}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Registration failed");
  }
  return data as AuthResponse;
}

export interface SigninPayload {
  email: string;
  password: string;
}

export async function signin(payload: SigninPayload): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Login failed");
  }
  return data as AuthResponse;
}

export async function fetchMe(): Promise<AuthUser> {
  const data = await authedJsonRequest<{ user: AuthUser }>('/api/me');
  return data.user;
}

export interface UpdateSettingsPayload {
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  jobTitle?: string;
}

export interface SettingsResponse {
  message: string;
  user: AuthUser;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function fetchSettings(): Promise<AuthUser> {
  const data = await authedJsonRequest<{ user: AuthUser }>('/api/settings');
  return data.user;
}

export async function updateSettings(
  payload: UpdateSettingsPayload,
): Promise<SettingsResponse> {
  return authedJsonRequest<SettingsResponse>('/api/settings', {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<MessageResponse> {
  return authedJsonRequest<MessageResponse>('/api/settings/password', {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export interface ForgotPasswordRequestPayload {
  email: string;
}

export async function requestPasswordReset(
  payload: ForgotPasswordRequestPayload,
): Promise<MessageResponse> {
  const res = await fetch(`${AUTH_API_BASE}/api/forgot-password/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Failed to send reset OTP");
  }

  return data as MessageResponse;
}

export interface ResetPasswordWithOtpPayload {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export async function resetPasswordWithOtp(
  payload: ResetPasswordWithOtpPayload,
): Promise<MessageResponse> {
  const res = await fetch(`${AUTH_API_BASE}/api/forgot-password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Failed to reset password");
  }

  return data as MessageResponse;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export async function verifyEmail(
  payload: VerifyEmailPayload,
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_API_BASE}/api/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Failed to verify email");
  }

  return data as AuthResponse;
}

export async function fetchSessionsBootstrap(
  jobId?: string,
): Promise<SessionsBootstrapResponse> {
  const query = jobId ? `?jobId=${encodeURIComponent(jobId)}` : '';
  return authedJsonRequest<SessionsBootstrapResponse>(
    `/api/sessions/bootstrap${query}`,
  );
}

export async function createInterviewSession(
  payload: CreateSessionPayload,
): Promise<SessionWithMessageResponse> {
  return authedJsonRequest<SessionWithMessageResponse>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function assignCandidateToSession(
  payload: AssignCandidatePayload,
): Promise<SessionWithMessageResponse> {
  return authedJsonRequest<SessionWithMessageResponse>(
    '/api/sessions/assign-candidate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export async function sendAssignmentEmailToCandidate(
  candidateId: string,
): Promise<SessionWithMessageResponse> {
  return authedJsonRequest<SessionWithMessageResponse>(
    '/api/sessions/send-assignment-email',
    {
      method: 'POST',
      body: JSON.stringify({ candidateId }),
    },
  );
}

export async function updateSessionCandidateDetails(
  sessionId: string,
  candidateId: string,
  payload: UpdateSessionCandidatePayload,
): Promise<SessionWithMessageResponse> {
  return authedJsonRequest<SessionWithMessageResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}/candidates/${encodeURIComponent(candidateId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export async function updateInterviewSession(
  sessionId: string,
  payload: UpdateSessionPayload,
): Promise<SessionWithMessageResponse> {
  return authedJsonRequest<SessionWithMessageResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
}

export async function conductInterviewSession(
  sessionId: string,
): Promise<SessionWithMessageResponse> {
  return authedJsonRequest<SessionWithMessageResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}/conduct`,
    {
      method: 'POST',
    },
  );
}

export async function sendSessionScheduleEmails(
  sessionId: string,
): Promise<SessionWithMessageResponse> {
  return authedJsonRequest<SessionWithMessageResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}/send-schedule-emails`,
    {
      method: 'POST',
    },
  );
}

export async function sendSessionResultEmails(
  sessionId: string,
): Promise<SessionWithMessageResponse> {
  return authedJsonRequest<SessionWithMessageResponse>(
    `/api/sessions/${encodeURIComponent(sessionId)}/send-result-emails`,
    {
      method: 'POST',
    },
  );
}

export async function sendSessionCandidateEmail(
  sessionId: string,
  payload: SendCandidateEmailPayload,
): Promise<{
  message: string;
  session: InterviewSession;
  emailLog: SessionEmailLog;
}> {
  return authedJsonRequest<{
    message: string;
    session: InterviewSession;
    emailLog: SessionEmailLog;
  }>(`/api/sessions/${encodeURIComponent(sessionId)}/send-candidate-email`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchSessionCandidatePacket(
  sessionId: string,
  candidateId: string,
): Promise<SessionCandidatePacket> {
  return authedJsonRequest<SessionCandidatePacket>(
    `/api/sessions/${encodeURIComponent(sessionId)}/candidates/${encodeURIComponent(candidateId)}/packet`,
  );
}

export async function updateSessionEmailTemplate(
  templateKey: SessionEmailTemplateKey,
  content: string,
): Promise<{ message: string; emailTemplates: SessionEmailTemplates }> {
  return authedJsonRequest<{ message: string; emailTemplates: SessionEmailTemplates }>(
    `/api/sessions/email-templates/${encodeURIComponent(templateKey)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ content }),
    },
  );
}

// ── Job Forms API ────────────────────────────────────────────────────────────

export type FieldType = "text" | "phone" | "email" | "file" | "link";

export interface FormField {
  label: string;
  type: FieldType;
  required?: boolean;
  order?: number;
}

export interface JobForm {
  _id: string;
  title: string;
  description: string;
  jobRole: string;
  fields: FormField[];
  isActive: boolean;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobFormPayload {
  title: string;
  description?: string;
  jobRole?: string;
  fields: FormField[];
}

export async function createJobForm(
  payload: CreateJobFormPayload,
): Promise<{ message: string; form: JobForm }> {
  return authedJsonRequest<{ message: string; form: JobForm }>('/api/forms', {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAllJobForms(): Promise<{
  forms: JobForm[];
  count: number;
}> {
  return authedJsonRequest<{ forms: JobForm[]; count: number }>('/api/forms');
}

export interface PublicJobForm {
  id: string;
  title: string;
  description: string;
  jobRole: string;
  fields: FormField[];
  isActive: boolean;
  company: string;
}

export async function getJobFormById(formId: string): Promise<PublicJobForm> {
  const res = await fetch(`${AUTH_API_BASE}/api/public/forms/${formId}`, {
    method: "GET",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data as ApiError).message ||
        (data as ApiError).error ||
        "Failed to fetch form",
    );
  }

  return data;
}

export async function updateJobForm(
  formId: string,
  payload: Partial<CreateJobFormPayload> & { isActive?: boolean },
): Promise<{ message: string; form: JobForm }> {
  return authedJsonRequest<{ message: string; form: JobForm }>(
    `/api/forms/${formId}`,
    {
    method: "PUT",
    body: JSON.stringify(payload),
    },
  );
}

export async function deleteJobForm(formId: string): Promise<MessageResponse> {
  return authedJsonRequest<MessageResponse>(`/api/forms/${formId}`, {
    method: 'DELETE',
  });
}

export interface FormSubmissionPayload {
  [key: string]: string | File | undefined;
}

export async function submitJobFormResponse(
  formId: string,
  submittedData: FormSubmissionPayload,
): Promise<{ message: string; submissionId: string }> {
  const res = await fetch(
    `${AUTH_API_BASE}/api/public/forms/${formId}/submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submittedData }),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data as ApiError).message ||
        (data as ApiError).error ||
        "Failed to submit form",
    );
  }

  return data;
}

export interface FormSubmission {
  _id: string;
  formId: string;
  submittedData: Record<string, unknown>;
  submitterEmail: string;
  status: "submitted" | "reviewed" | "rejected" | "accepted";
  notes: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export async function getFormSubmissions(
  formId: string,
  options?: {
    sortBy?: "latest" | "oldest";
    status?: string;
    page?: number;
    limit?: number;
  },
): Promise<{
  submissions: FormSubmission[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const params = new URLSearchParams();
  if (options?.sortBy) params.append("sortBy", options.sortBy);
  if (options?.status) params.append("status", options.status);
  if (options?.page) params.append("page", options.page.toString());
  if (options?.limit) params.append("limit", options.limit.toString());
  const query = params.toString();
  return authedJsonRequest<{
    submissions: FormSubmission[];
    total: number;
    page: number;
    totalPages: number;
  }>(`/api/forms/${formId}/submissions${query ? `?${query}` : ''}`);
}

export interface UpdateSubmissionPayload {
  status?: "submitted" | "reviewed" | "rejected" | "accepted";
  notes?: string;
  rating?: number;
}

export async function updateFormSubmissionStatus(
  submissionId: string,
  payload: UpdateSubmissionPayload,
): Promise<{ message: string; submission: FormSubmission }> {
  return authedJsonRequest<{ message: string; submission: FormSubmission }>(
    `/api/submissions/${submissionId}`,
    {
    method: "PUT",
    body: JSON.stringify(payload),
    },
  );
}
