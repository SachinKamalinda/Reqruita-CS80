'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { requestPasswordReset, resetPasswordWithOtp } from '@/lib/api';

type Step = 'request' | 'reset' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [step, setStep] = useState<Step>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      setStep('reset');
    }
  }, [searchParams]);

  const cardTitle = useMemo(() => {
    if (step === 'success') return 'Password updated';
    if (step === 'reset') return 'Enter OTP and new password';
    return 'Forgot your password?';
  }, [step]);

  const inputBase =
    'w-full py-2.5 px-3.5 border-[1.5px] border-gray-200 rounded-xl bg-gray-50 outline-none text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 placeholder:font-normal hover:border-gray-300 hover:bg-gray-100 focus:border-purple-600 focus:bg-white focus:shadow-[0_0_0_3px_rgba(124,58,237,0.08)]';

  const requestOtp = async () => {
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestPasswordReset({ email: email.trim() });
      setInfo(result.message);
      setStep('reset');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to send reset instructions right now.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestOtp();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim() || !otp.trim() || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPasswordWithOtp({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });
      setInfo(result.message);
      setStep('success');
      setTimeout(() => {
        router.push('/signin');
      }, 2000);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reset password. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="h-screen w-screen flex items-center justify-center bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: 'url("/sign-up-bg.png")' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-purple-800/10 z-0" />

      <div className="relative z-10 w-full px-4 py-6 flex justify-center">
        <div className="w-full max-w-[460px] bg-white/[0.97] backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/10 border border-white/60 px-8 py-9">
          <div className="flex flex-col items-center mb-7 text-center">
            <h2 className="text-[1.6rem] font-bold text-gray-900 leading-tight">
              {cardTitle}
            </h2>
            <p className="text-sm text-gray-400 mt-1.5">
              {step === 'request' &&
                'Enter your email and we’ll send a reset OTP.'}
              {step === 'reset' &&
                'Check your email, then paste the 6-digit OTP below.'}
              {step === 'success' &&
                'Password reset completed. Redirecting to sign in…'}
            </p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {info && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              {info}
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="block text-[13px] font-semibold text-gray-700 tracking-[0.01em]">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className={inputBase}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-[15px] shadow-lg shadow-purple-500/25 hover:shadow-purple-600/30 transition-all duration-200 active:scale-[0.99]"
              >
                {isLoading ? 'Sending OTP…' : 'Send reset OTP'}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="block text-[13px] font-semibold text-gray-700 tracking-[0.01em]">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={inputBase}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="block text-[13px] font-semibold text-gray-700 tracking-[0.01em]">
                  OTP code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className={inputBase}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="block text-[13px] font-semibold text-gray-700 tracking-[0.01em]">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className={inputBase}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="block text-[13px] font-semibold text-gray-700 tracking-[0.01em]">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  className={inputBase}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-[15px] shadow-lg shadow-purple-500/25 hover:shadow-purple-600/30 transition-all duration-200 active:scale-[0.99]"
              >
                {isLoading ? 'Resetting password…' : 'Reset password'}
              </button>

              <button
                type="button"
                onClick={requestOtp}
                disabled={isLoading}
                className="w-full border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed py-3 rounded-xl font-semibold text-[15px] transition-all duration-150"
              >
                Resend OTP
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-4">
              <Link
                href="/signin"
                className="w-full inline-flex justify-center bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 rounded-xl font-semibold text-[15px] shadow-lg shadow-purple-500/25 hover:shadow-purple-600/30 transition-all duration-200"
              >
                Go to sign in now
              </Link>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 pt-6">
            Back to{' '}
            <Link
              href="/signin"
              className="font-semibold text-purple-600 hover:text-purple-700 transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
