"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AUTH_API_BASE } from "@/lib/api";

function SetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const res = await fetch(`${AUTH_API_BASE}/api/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Success! Password set. Redirecting to login...");
        setTimeout(() => router.push("/signin"), 2000);
      } else {
        setError(data.message || "Failed to set password.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          Invalid or missing invitation token.
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <h1 className="text-2xl font-bold mb-2">Set Your Account Password</h1>
        <p className="text-gray-500 text-sm mb-6">Welcome to Reqruita! Please choose a secure password to activate your account.</p>
        
        {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">{error}</div>}
        {success && <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-100">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#5D20B3] text-white font-bold rounded-xl shadow-lg hover:bg-[#4a1a8a] transition-all transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Activating Account..." : "Activate & Go to Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SetPasswordContent />
    </Suspense>
  );
}
