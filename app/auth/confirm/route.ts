import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Known Supabase email-OTP link types this route is prepared to verify.
// Restricting to a known set (rather than passing whatever's in the query
// string straight through) means a malformed/tampered `type` value fails
// cleanly instead of being handed to Supabase unexamined.
const KNOWN_OTP_TYPES = ["recovery", "signup", "invite", "email_change", "magiclink", "email"] as const;
type KnownOtpType = (typeof KNOWN_OTP_TYPES)[number];

function isKnownOtpType(value: string | null): value is KnownOtpType {
  return value !== null && (KNOWN_OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Verifies Supabase email-OTP links (password reset today; the same
 * mechanism also covers signup confirmation, invites, etc.) via
 * verifyOtp(token_hash), NOT the PKCE code-exchange flow in
 * app/auth/callback/route.ts.
 *
 * Why this route exists instead of reusing /auth/callback: PKCE's
 * exchangeCodeForSession() requires a secret that was stored in the
 * *browser that initiated the request* — fine for flows completed in one
 * continuous session (Google sign-in), but password reset is inherently
 * cross-context: a student submits "forgot password" in one browser, then
 * opens the email and clicks the link somewhere else entirely (their email
 * app's in-app browser, a different device). That mismatch made
 * exchangeCodeForSession() fail every time, silently, sending the student
 * back to /login with no explanation. verifyOtp(token_hash) validates using
 * only what's in the link itself — no browser-local secret required — so it
 * works regardless of where the link is opened.
 *
 * Requires the Reset Password (and any other affected) email template in
 * the Supabase dashboard to link here directly — see the comment on
 * resetPasswordEmail() in lib/auth/actions.ts for the exact template change
 * this depends on.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  if (tokenHash && isKnownOtpType(typeParam)) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type: typeParam, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Invalid, expired, or already-used link — surfaced to the student as an
  // explicit message rather than silently landing on login unexplained.
  return NextResponse.redirect(`${origin}/login?error=invalid_reset_link`);
}
