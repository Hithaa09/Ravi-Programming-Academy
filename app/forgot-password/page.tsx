"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { resetPasswordEmail } from "@/lib/auth/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await resetPasswordEmail(email);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-container p-6 md:p-4">
      <div className="w-full max-w-md bg-surface-bright rounded-2xl shadow-card p-8 md:p-10">
        <div className="text-center mb-6">
          <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight">{"{R.}"}</span>
          <p className="font-body-md text-body-md text-secondary mt-1">Ravi Programming Academy</p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-[48px] text-secondary">mark_email_read</span>
            <h1 className="font-headline-xl text-headline-xl text-on-surface mt-4">Email Sent</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
              If <strong>{email}</strong> is registered, you&apos;ll receive a password reset link shortly.
            </p>
            <Link href="/login" className="mt-6 font-label-md text-label-md text-secondary font-medium hover:underline">
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-headline-xl text-headline-xl text-on-surface">Forgot Password</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 mb-6">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 md:py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>
              {error && (
                <p className="font-label-md text-label-md text-error">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-container text-white py-2.5 md:py-3 rounded-lg font-label-md text-label-md font-bold hover:bg-primary-container/90 transition-colors disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link href="/login" className="font-label-md text-label-md text-secondary font-medium hover:underline">
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
