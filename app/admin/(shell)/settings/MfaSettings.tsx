"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getVerifiedMfaFactors,
  enrollMfaFactor,
  verifyMfaEnrollment,
  removeMfaFactor,
  type MfaFactor,
} from "@/lib/auth/mfa";

interface Feedback {
  type: "success" | "error";
  text: string;
}

function FeedbackBanner({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  const isError = feedback.type === "error";
  return (
    <div
      className={`mb-6 flex items-center gap-3 rounded-lg px-4 py-3 font-body-md text-body-md ${
        isError
          ? "bg-error/5 border border-error/20 text-error"
          : "bg-status-solved-bg border border-status-solved-text/20 text-status-solved-text"
      }`}
    >
      <span className="material-symbols-outlined text-[18px] shrink-0">{isError ? "error" : "check_circle"}</span>
      {feedback.text}
    </div>
  );
}

export function MfaSettings() {
  // null = still loading the initial list.
  const [factors, setFactors] = useState<MfaFactor[] | null>(null);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function refresh() {
    setFactors(await getVerifiedMfaFactors());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleStartEnroll() {
    setFeedback(null);
    setBusy(true);
    const result = await enrollMfaFactor();
    setBusy(false);
    if ("error" in result) {
      setFeedback({ type: "error", text: result.error });
      return;
    }
    setEnrolling(result);
  }

  async function handleConfirmEnroll(e: FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setBusy(true);
    setFeedback(null);
    const result = await verifyMfaEnrollment(enrolling.factorId, code);
    setBusy(false);
    if (result.error) {
      setFeedback({ type: "error", text: result.error });
      return;
    }
    setEnrolling(null);
    setCode("");
    setFeedback({ type: "success", text: "Authenticator added. You'll be asked for a code from it on your next login." });
    await refresh();
  }

  function handleCancelEnroll() {
    setEnrolling(null);
    setCode("");
    setFeedback(null);
  }

  async function handleRemove(factorId: string) {
    setBusy(true);
    setFeedback(null);
    const result = await removeMfaFactor(factorId);
    setBusy(false);
    if (result.error) {
      setFeedback({ type: "error", text: result.error });
      return;
    }
    setFeedback({ type: "success", text: "Authenticator removed." });
    await refresh();
  }

  return (
    <Card className="p-card-padding max-w-xl">
      <h2 className="font-headline-md text-headline-md text-on-surface mb-1">Two-Factor Authentication</h2>
      <p className="font-body-md text-body-md text-on-surface-variant mb-6">
        Requires a code from an authenticator app (Google Authenticator, Authy, 1Password, etc.) in addition to your
        password when signing in. You can add more than one authenticator — e.g. a second device — as a backup in
        case you lose access to the first.
      </p>
      <FeedbackBanner feedback={feedback} />

      {factors === null ? (
        <p className="font-body-md text-body-md text-on-surface-variant">Loading…</p>
      ) : enrolling ? (
        <form onSubmit={handleConfirmEnroll} className="space-y-5">
          <div>
            <p className="font-label-md text-label-md font-bold text-on-surface mb-2">1. Scan this with your authenticator app</p>
            {/* Data URI from Supabase's own enrollment response — not a remote image, so a plain <img> is correct here (next/image doesn't handle data: URIs). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrolling.qrCode} alt="Scan this QR code with your authenticator app" className="w-48 h-48 border border-outline-variant/30 rounded-lg" />
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-2">
              Can&apos;t scan it? Enter this code manually: <span className="font-mono">{enrolling.secret}</span>
            </p>
          </div>
          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">2. Enter the 6-digit code it shows</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary tracking-[0.3em] text-center font-mono text-lg max-w-[220px]"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>{busy ? "Verifying…" : "Confirm"}</Button>
            <Button type="button" variant="secondary" onClick={handleCancelEnroll} disabled={busy}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {factors.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">No authenticator app is set up yet — your account is only protected by your password.</p>
          ) : (
            <div className="divide-y divide-outline-variant/10 border border-outline-variant/20 rounded-lg overflow-hidden">
              {factors.map((f) => (
                <div key={f.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-status-solved-text">verified_user</span>
                    <span className="font-label-md text-label-md text-on-surface">
                      {f.friendlyName || "Authenticator app"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(f.id)}
                    disabled={busy}
                    className="font-label-sm text-label-sm text-error hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" onClick={handleStartEnroll} disabled={busy}>
            {busy ? "Starting…" : factors.length === 0 ? "Enable Two-Factor Authentication" : "Add Another Authenticator"}
          </Button>
        </div>
      )}
    </Card>
  );
}
