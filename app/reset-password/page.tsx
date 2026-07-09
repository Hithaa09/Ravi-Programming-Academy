"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/lib/auth/actions";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-container p-6 md:p-4">
      <div className="w-full max-w-md bg-surface-bright rounded-2xl shadow-card p-8 md:p-10">
        <div className="text-center mb-6">
          <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight">{"{R.}"}</span>
          <p className="font-body-md text-body-md text-secondary mt-1">Ravi Programming Academy</p>
        </div>

        <h1 className="font-headline-xl text-headline-xl text-on-surface">Set New Password</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 mb-6">
          Choose a strong password for your account.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 md:py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
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
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
