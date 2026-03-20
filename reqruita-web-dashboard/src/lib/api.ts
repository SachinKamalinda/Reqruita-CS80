const AUTH_API_BASE =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:3003';

export interface AuthUser {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyName?: string;
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
  position: string;
  applicants: number;
}

export interface SessionInterviewer {
  id: string;
  name: string;
  email: string;
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

export interface SessionCandidatePacket {
  generatedAt: string;
  candidate: SessionCandidate;
  session: {
    id: string;
    name: string;
    jobTitle: string;
    interviewer: string;
    interviewerEmail: string;
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
  localStorage.setItem('reqruita_token', token);
}

export function getToken(): string | null {
  return localStorage.getItem('reqruita_token');
}

export function removeToken(): void {
  localStorage.removeItem('reqruita_token');
  localStorage.removeItem('reqruita_user');
}

export function saveUser(user: AuthUser): void {
  localStorage.setItem('reqruita_user', JSON.stringify(user));
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('reqruita_user');
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || 'Registration failed');
  }
  return data as AuthResponse;
}

export interface SigninPayload {
  email: string;
  password: string;
}

export async function signin(payload: SigninPayload): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || 'Login failed');
  }
  return data as AuthResponse;
}

export async function fetchMe(): Promise<AuthUser> {
  const token = getToken();
  const res = await fetch(`${AUTH_API_BASE}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || 'Failed to fetch user');
  }
  return (data as { user: AuthUser }).user;
}

export interface ForgotPasswordRequestPayload {
  email: string;
}

export async function requestPasswordReset(
  payload: ForgotPasswordRequestPayload,
): Promise<MessageResponse> {
  const res = await fetch(`${AUTH_API_BASE}/api/forgot-password/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || 'Failed to send reset OTP');
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || 'Failed to reset password');
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || 'Failed to verify email');
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
