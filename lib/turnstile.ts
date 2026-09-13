// Cloudflare Turnstile — bot protection on the auth forms most likely to
// be targeted by scripted abuse (signup, login). Plain server-only module,
// deliberately not "use server": it's imported by lib/auth/actions.ts and
// must never become a directly client-callable action itself.
//
// The widget's own site key is public (NEXT_PUBLIC_TURNSTILE_SITE_KEY,
// embedded in the browser by design — that's how Cloudflare's widget script
// knows which site it's protecting). The secret key is server-only and
// verifies whatever token the widget produced actually came from a real,
// Cloudflare-cleared browser session, not a replayed/forged value.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Fails closed (returns false) rather than throwing on any error — a
// misconfigured or unreachable Turnstile verification call should block the
// action it's protecting, not silently let it through as if verification
// never happened.
export async function verifyTurnstileToken(token: string | undefined | null): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return false;
  if (!token) return false;

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: secretKey, response: token }),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
