"use server";

// Admin-only TOTP (authenticator app) two-factor authentication, built
// directly on Supabase Auth's own MFA support — no separate secret storage
// or verification logic of this app's own. Every function here only ever
// acts on the CALLING user's own factors (Supabase's mfa.* client APIs are
// inherently scoped that way), so the admin-only check below is about
// keeping this feature admin-only, not about authorizing access to someone
// else's factors — that's structurally impossible through this API either way.

import { createClient } from "@/lib/supabase/server";

async function requireAdmin(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || role !== "admin") throw new Error("Unauthorized");
}

export interface MfaFactor {
  id: string;
  friendlyName: string | null;
  createdAt: string;
}

export async function getVerifiedMfaFactors(): Promise<MfaFactor[]> {
  await requireAdmin();
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return [];
  return data.totp
    .filter((f) => f.status === "verified")
    .map((f) => ({ id: f.id, friendlyName: f.friendly_name ?? null, createdAt: f.created_at }));
}

export interface EnrollMfaResult {
  factorId: string;
  qrCode: string; // SVG data URI, ready for an <img src="...">
  secret: string; // manual-entry fallback if the admin can't scan the QR code
}

export async function enrollMfaFactor(): Promise<EnrollMfaResult | { error: string }> {
  await requireAdmin();
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error || !data) return { error: error?.message ?? "Could not start enrollment. Please try again." };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

// Confirms enrollment by verifying one real code from the authenticator
// app — an enrolled-but-unverified factor is never actually usable to sign
// in, so this is the step that makes it count. challenge() + verify() are
// two calls because Supabase's MFA API always separates "start a challenge"
// from "answer it", the same shape used again at login time.
export async function verifyMfaEnrollment(factorId: string, code: string): Promise<{ error: string | null }> {
  await requireAdmin();
  const supabase = createClient();
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challenge) return { error: challengeError?.message ?? "Could not verify this code. Please try again." };

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) return { error: "Incorrect code. Check your authenticator app and try again." };
  return { error: null };
}

// Supabase requires the caller to already be at aal2 (i.e. already
// completed a 2FA challenge this session) to remove a verified factor —
// enforced by Supabase itself, not re-checked here, so a stolen password
// alone can never turn 2FA off.
export async function removeMfaFactor(factorId: string): Promise<{ error: string | null }> {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: error.message };
  return { error: null };
}
