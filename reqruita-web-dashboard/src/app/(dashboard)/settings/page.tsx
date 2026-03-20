"use client";

import { useEffect, useState } from "react";
import {
  changePassword,
  fetchSettings,
  saveUser,
  updateSettings,
  type AuthUser,
} from "@/lib/api";

type SettingsForm = {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  jobTitle: string;
  weeklyDigest: boolean;
  interviewReminders: boolean;
  candidateAlerts: boolean;
  securityAlerts: boolean;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const DEFAULT_FORM_DATA: SettingsForm = {
  firstName: "",
  lastName: "",
  email: "",
  companyName: "",
  jobTitle: "",
  weeklyDigest: true,
  interviewReminders: true,
  candidateAlerts: true,
  securityAlerts: true,
};

const buildSettingsForm = (user: AuthUser): SettingsForm => ({
  firstName: user.firstName ?? "",
  lastName: user.lastName ?? "",
  email: user.email ?? "",
  companyName: user.companyName ?? "",
  jobTitle: user.jobTitle ?? "",
  weeklyDigest: user.notificationPreferences?.weeklyDigest ?? true,
  interviewReminders: user.notificationPreferences?.interviewReminders ?? true,
  candidateAlerts: user.notificationPreferences?.candidateAlerts ?? true,
  securityAlerts: user.notificationPreferences?.securityAlerts ?? true,
});

export default function SettingsPage() {
  const [formData, setFormData] = useState<SettingsForm>(DEFAULT_FORM_DATA);
  const [initialFormData, setInitialFormData] =
    useState<SettingsForm>(DEFAULT_FORM_DATA);
  const [passwordData, setPasswordData] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const user = await fetchSettings();
        const nextForm = buildSettingsForm(user);
        setFormData(nextForm);
        setInitialFormData(nextForm);
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Failed to load settings. Please refresh.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateField = <K extends keyof SettingsForm>(
    key: K,
    value: SettingsForm[K],
  ) => {
    setSaveError(null);
    setSaveSuccess(null);
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    setSaving(true);
    try {
      const response = await updateSettings({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        companyName: formData.companyName,
        jobTitle: formData.jobTitle,
        notificationPreferences: {
          weeklyDigest: formData.weeklyDigest,
          interviewReminders: formData.interviewReminders,
          candidateAlerts: formData.candidateAlerts,
          securityAlerts: formData.securityAlerts,
        },
      });

      saveUser(response.user);
      const syncedForm = buildSettingsForm(response.user);
      setFormData(syncedForm);
      setInitialFormData(syncedForm);
      setSaveSuccess(response.message || "Settings saved successfully.");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save settings. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handlePasswordFieldChange = <K extends keyof PasswordForm>(
    key: K,
    value: PasswordForm[K],
  ) => {
    setPasswordError(null);
    setPasswordSuccess(null);
    setPasswordData((prev) => ({ ...prev, [key]: value }));
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setPasswordError("All password fields are required.");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await changePassword(passwordData);
      setPasswordSuccess(response.message || "Password changed successfully.");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
    } catch (error) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Failed to change password. Please try again.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <section className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Profile Information
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Update your personal and company details.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">
              First Name
            </span>
            <input
              value={formData.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-reqruita-purple focus:bg-white"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Last Name</span>
            <input
              value={formData.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-reqruita-purple focus:bg-white"
            />
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input
              type="email"
              value={formData.email}
              onChange={(event) => updateField("email", event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-reqruita-purple focus:bg-white"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Company</span>
            <input
              value={formData.companyName}
              onChange={(event) =>
                updateField("companyName", event.target.value)
              }
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-reqruita-purple focus:bg-white"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Job Title</span>
            <input
              value={formData.jobTitle}
              onChange={(event) => updateField("jobTitle", event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-reqruita-purple focus:bg-white"
            />
          </label>
        </div>

        {(saveError || saveSuccess) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              saveError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {saveError || saveSuccess}
          </div>
        )}
      </section>

      <section className="xl:col-span-1 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6 h-fit">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
          <p className="text-sm text-gray-500 mt-1">
            Keep your account safe with regular updates.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              setShowPasswordForm((prev) => !prev);
              setPasswordError(null);
              setPasswordSuccess(null);
            }}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-left hover:bg-gray-50 transition-colors"
          >
            {showPasswordForm ? "Hide Password Form" : "Change Password"}
          </button>
          <button
            disabled
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-left text-gray-400 cursor-not-allowed"
          >
            Enable 2FA
          </button>
        </div>

        {showPasswordForm && (
          <div className="space-y-3 rounded-xl border border-gray-200 p-3.5 bg-gray-50">
            <input
              type="password"
              value={passwordData.currentPassword}
              placeholder="Current password"
              onChange={(event) =>
                handlePasswordFieldChange("currentPassword", event.target.value)
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-reqruita-purple"
            />
            <input
              type="password"
              value={passwordData.newPassword}
              placeholder="New password"
              onChange={(event) =>
                handlePasswordFieldChange("newPassword", event.target.value)
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-reqruita-purple"
            />
            <input
              type="password"
              value={passwordData.confirmPassword}
              placeholder="Confirm new password"
              onChange={(event) =>
                handlePasswordFieldChange("confirmPassword", event.target.value)
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-reqruita-purple"
            />
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="w-full rounded-xl bg-reqruita-purple px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4c1a90] disabled:opacity-70"
            >
              {changingPassword ? "Updating Password..." : "Update Password"}
            </button>
            {(passwordError || passwordSuccess) && (
              <p
                className={`text-xs ${
                  passwordError ? "text-red-600" : "text-green-600"
                }`}
              >
                {passwordError || passwordSuccess}
              </p>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 space-y-3">
          <h3 className="text-base font-semibold text-gray-900">
            Notifications
          </h3>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3.5 py-3">
            <span className="text-sm text-gray-700">Weekly digest</span>
            <input
              type="checkbox"
              checked={formData.weeklyDigest}
              onChange={(event) =>
                updateField("weeklyDigest", event.target.checked)
              }
              className="h-4 w-4 accent-reqruita-purple"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3.5 py-3">
            <span className="text-sm text-gray-700">Interview reminders</span>
            <input
              type="checkbox"
              checked={formData.interviewReminders}
              onChange={(event) =>
                updateField("interviewReminders", event.target.checked)
              }
              className="h-4 w-4 accent-reqruita-purple"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3.5 py-3">
            <span className="text-sm text-gray-700">Candidate alerts</span>
            <input
              type="checkbox"
              checked={formData.candidateAlerts}
              onChange={(event) =>
                updateField("candidateAlerts", event.target.checked)
              }
              className="h-4 w-4 accent-reqruita-purple"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3.5 py-3">
            <span className="text-sm text-gray-700">Security alerts</span>
            <input
              type="checkbox"
              checked={formData.securityAlerts}
              onChange={(event) =>
                updateField("securityAlerts", event.target.checked)
              }
              className="h-4 w-4 accent-reqruita-purple"
            />
          </label>
        </div>
      </section>

      <div className="xl:col-span-3 flex items-center justify-end gap-3">
        <button
          onClick={handleCancel}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-reqruita-purple text-white text-sm font-semibold hover:bg-[#4c1a90] transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
