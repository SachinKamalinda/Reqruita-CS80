'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyEmail } from '@/lib/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    } else {
      setError('No email provided for verification.');
    }
  }, [searchParams]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !otp.trim()) {
      setError('Email and OTP are required.');
      return;
    }

    if (otp.trim().length !== 6) {
      setError('OTP must be 6 digits.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyEmail({
        email: email.trim(),
        otp: otp.trim(),
      });

      // Save token and user
      localStorage.setItem('reqruita_token', result.token);
      localStorage.setItem('reqruita_user', JSON.stringify(result.user));

      setSuccess(true);
      setOtp('');
      setTimeout(() => {
        router.push('/home');
      }, 1500);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to verify email. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase =
    'w-full py-2.5 px-3.5 border-[1.5px] border-gray-200 rounded-xl bg-gray-50 outline-none text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 placeholder:font-normal hover:border-gray-300 hover:bg-gray-100 focus:border-purple-600 focus:bg-white focus:shadow-[0_0_0_3px_rgba(124,58,237,0.08)]';

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
              {success ? 'Email verified!' : 'Verify your email'}
            </h2>
            <p className="text-sm text-gray-400 mt-1.5">
              {success
                ? 'Redirecting you to your dashboard...'
                : 'Check your inbox for the verification code'}
            </p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {!success && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="block text-[13px] font-semibold text-gray-700 tracking-[0.01em]">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  disabled
                  autoComplete="email"
                  className={`${inputBase} opacity-60 cursor-not-allowed`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="block text-[13px] font-semibold text-gray-700 tracking-[0.01em]">
                  Verification code
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
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-[15px] shadow-lg shadow-purple-500/25 hover:shadow-purple-600/30 transition-all duration-200 active:scale-[0.99]"
              >
                {isLoading ? 'Verifying...' : 'Verify email'}
              </button>
            </form>
          )}

          {success && (
            <div className="flex items-center justify-center gap-2 py-6">
              <svg
                className="w-6 h-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-green-600 font-semibold">Success!</span>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 pt-6">
            <Link
              href="/signin"
              className="font-semibold text-purple-600 hover:text-purple-700 transition-colors"
            >
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
