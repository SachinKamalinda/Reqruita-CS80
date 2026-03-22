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
  isMainAdmin?: boolean;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  country?: string;
  notificationPreferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  weeklyDigest: boolean;
  interviewReminders: boolean;
  candidateAlerts: boolean;
  securityAlerts: boolean;
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
  const token = getToken();
  const res = await fetch(`${AUTH_API_BASE}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Failed to fetch user");
  }
  return (data as { user: AuthUser }).user;
}

export interface UpdateSettingsPayload {
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  jobTitle?: string;
  notificationPreferences: NotificationPreferences;
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
  const token = getToken();
  const res = await fetch(`${AUTH_API_BASE}/api/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Failed to fetch settings");
  }

  return (data as { user: AuthUser }).user;
}

export async function updateSettings(
  payload: UpdateSettingsPayload,
): Promise<SettingsResponse> {
  const token = getToken();
  const res = await fetch(`${AUTH_API_BASE}/api/settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Failed to update settings");
  }

  return data as SettingsResponse;
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<MessageResponse> {
  const token = getToken();
  const res = await fetch(`${AUTH_API_BASE}/api/settings/password`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Failed to change password");
  }

  return data as MessageResponse;
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
  const token = getToken();
  if (!token) {
    throw new Error("Authentication required");
  }

  const res = await fetch(`${AUTH_API_BASE}/api/forms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Failed to create job form");
  }

  return data;
}

export async function getAllJobForms(): Promise<{
  forms: JobForm[];
  count: number;
}> {
  const token = getToken();
  if (!token) {
    throw new Error("Authentication required");
  }

  const res = await fetch(`${AUTH_API_BASE}/api/forms`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Failed to fetch job forms");
  }

  return data;
}

export interface PublicJobForm {
  id: string;
  title: string;
  description: string;
  jobRole: string;
  fields: FormField[];
  company: string;
}

export async function getJobFormById(formId: string): Promise<PublicJobForm> {
  const res = await fetch(`${AUTH_API_BASE}/api/public/forms/${formId}`, {
    method: "GET",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Failed to fetch form");
  }

  return data;
}

export async function updateJobForm(
  formId: string,
  payload: Partial<CreateJobFormPayload>,
): Promise<{ message: string; form: JobForm }> {
  const token = getToken();
  if (!token) {
    throw new Error("Authentication required");
  }

  const res = await fetch(`${AUTH_API_BASE}/api/forms/${formId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Failed to update form");
  }

  return data;
}

export async function deleteJobForm(formId: string): Promise<MessageResponse> {
  const token = getToken();
  if (!token) {
    throw new Error("Authentication required");
  }

  const res = await fetch(`${AUTH_API_BASE}/api/forms/${formId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ApiError).message || "Failed to delete form");
  }

  return data;
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
    throw new Error((data as ApiError).message || "Failed to submit form");
  }

  return data;
}

export interface FormSubmission {
  _id: string;
  formId: string;
  submittedData: Record<string, any>;
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
  const token = getToken();
  if (!token) {
    throw new Error("Authentication required");
  }

  const params = new URLSearchParams();
  if (options?.sortBy) params.append("sortBy", options.sortBy);
  if (options?.status) params.append("status", options.status);
  if (options?.page) params.append("page", options.page.toString());
  if (options?.limit) params.append("limit", options.limit.toString());

  const res = await fetch(
    `${AUTH_API_BASE}/api/forms/${formId}/submissions?${params}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data as ApiError).message || "Failed to fetch submissions",
    );
  }

  return data;
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
  const token = getToken();
  if (!token) {
    throw new Error("Authentication required");
  }

  const res = await fetch(`${AUTH_API_BASE}/api/submissions/${submissionId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data as ApiError).message || "Failed to update submission",
    );
  }

  return data;
}
