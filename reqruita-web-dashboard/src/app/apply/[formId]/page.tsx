"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getJobFormById,
  submitJobFormResponse,
  PublicJobForm,
} from "@/lib/api";

export default function JobFormFillerPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [form, setForm] = useState<PublicJobForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        const fetchedForm = await getJobFormById(formId);
        setForm(fetchedForm);

        // Initialize form data
        const initialData: Record<string, string> = {};
        fetchedForm.fields.forEach((field) => {
          initialData[field.label] = "";
        });
        setFormData(initialData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load form";
        setError(errorMessage);
        setToast({
          type: "error",
          message: errorMessage,
        });
      } finally {
        setLoading(false);
      }
    };

    if (formId) {
      fetchForm();
    }
  }, [formId]);

  const handleInputChange = (fieldLabel: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldLabel]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!form) return false;

    for (const field of form.fields) {
      if (field.required && !formData[field.label]?.trim()) {
        setToast({
          type: "error",
          message: `"${field.label}" is required.`,
        });
        return false;
      }

      const value = formData[field.label];
      if (value) {
        if (field.type === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            setToast({
              type: "error",
              message: `"${field.label}" must be a valid email address.`,
            });
            return false;
          }
        }

        if (field.type === "phone") {
          const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
          if (!phoneRegex.test(value)) {
            setToast({
              type: "error",
              message: `"${field.label}" must be a valid phone number.`,
            });
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await submitJobFormResponse(formId, formData);

      setSuccess(true);
      setToast({
        type: "success",
        message: "Your application has been submitted successfully!",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to submit form";
      setError(errorMessage);
      setToast({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex flex-col items-center justify-center p-4">
        {/* Loading Spinner */}
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-8" />
          <p className="text-purple-100">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex flex-col items-center justify-center p-4">
        {/* Error Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Form Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error ||
              "This form is no longer available or may have been deleted."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 rounded-xl font-semibold transition shadow-lg"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!form.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Submissions Closed
          </h1>
          <p className="text-gray-600 mb-2">
            Applications for <span className="font-semibold">{form.title}</span>{" "}
            are no longer being accepted.
          </p>
          <p className="text-sm text-gray-500">
            This submission link is currently offline.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex flex-col items-center justify-center p-4">
        {/* Success Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="text-green-600 text-4xl">✓</div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Application Submitted!
          </h1>
          <p className="text-gray-600 mb-2">
            Thank you for applying. We&rsquo;ll review your application with
            care.
          </p>
          <p className="text-sm text-gray-500">
            Our team will be in touch within 2-3 business days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header/Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-end">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Image
              src="/reqruita-logo.png"
              alt="Reqruita"
              width={16}
              height={16}
              className="w-4 h-4"
            />
            <span>Powered by Reqruita</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto py-12 px-4">
        {/* Company & Form Header */}
        <div className="mb-8">
          <div className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            {form.company}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-700 text-lg mb-2">{form.description}</p>
          )}
          <p className="text-sm text-gray-500">
            Fill out the form below to complete your application
          </p>
        </div>

        {/* Application Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-xl p-8 md:p-10 border border-gray-100"
        >
          {/* Form Fields */}
          <div className="space-y-8">
            {form.fields.map((field, index) => (
              <div key={index}>
                <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1">
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 text-lg">*</span>
                  )}
                </label>

                {field.type === "text" && (
                  <input
                    type="text"
                    value={formData[field.label] || ""}
                    onChange={(e) =>
                      handleInputChange(field.label, e.target.value)
                    }
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-200 transition text-gray-900 placeholder-gray-400 bg-white"
                  />
                )}

                {field.type === "email" && (
                  <input
                    type="email"
                    value={formData[field.label] || ""}
                    onChange={(e) =>
                      handleInputChange(field.label, e.target.value)
                    }
                    placeholder="your.email@example.com"
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-200 transition text-gray-900 placeholder-gray-400 bg-white"
                  />
                )}

                {field.type === "phone" && (
                  <input
                    type="tel"
                    value={formData[field.label] || ""}
                    onChange={(e) =>
                      handleInputChange(field.label, e.target.value)
                    }
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-200 transition text-gray-900 placeholder-gray-400 bg-white"
                  />
                )}

                {field.type === "link" && (
                  <input
                    type="url"
                    value={formData[field.label] || ""}
                    onChange={(e) =>
                      handleInputChange(field.label, e.target.value)
                    }
                    placeholder="https://example.com"
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-200 transition text-gray-900 placeholder-gray-400 bg-white"
                  />
                )}

                {field.type === "file" && (
                  <div className="relative">
                    <label className="relative cursor-pointer block">
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-600 hover:bg-purple-50 transition">
                        <svg
                          className="w-8 h-8 mx-auto mb-2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <p className="text-gray-600 font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          PDF, images, or documents
                        </p>
                      </div>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleInputChange(field.label, file.name);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    {formData[field.label] && (
                      <p className="text-sm text-green-600 mt-3 flex items-center gap-2 font-medium">
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {formData[field.label]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Buttons */}
          <div className="mt-10 flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 rounded-xl font-semibold transition transform hover:shadow-lg active:scale-95 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent" />
                  Submitting...
                </span>
              ) : (
                "Submit Application"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                const newData: Record<string, string> = {};
                form.fields.forEach((field) => {
                  newData[field.label] = "";
                });
                setFormData(newData);
              }}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 transition active:scale-95"
            >
              Clear Form
            </button>
          </div>
        </form>

        {/* Confidence Note */}
        <div className="mt-8 p-5 bg-blue-50 border border-blue-200 rounded-2xl text-center">
          <p className="text-gray-700 text-sm">
            <span className="font-semibold text-blue-700">
              🔒 Your data is secure
            </span>
            <br />
            We respect your privacy. Your information will only be used for
            recruitment purposes.
          </p>
        </div>

        {/* Support Footer */}
        <div className="text-center mt-10 text-gray-600 text-sm">
          <p className="text-gray-500 mb-4">
            For any questions, please contact the hiring company directly.
          </p>
          <p className="text-gray-400 text-xs">
            © 2026 Reqruita. All rights reserved.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl text-white font-medium shadow-xl animate-fade-in-out ${
            toast.type === "error"
              ? "bg-red-500"
              : toast.type === "success"
                ? "bg-green-500"
                : "bg-blue-500"
          } cursor-pointer hover:shadow-2xl transition`}
          onClick={() => setToast(null)}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
