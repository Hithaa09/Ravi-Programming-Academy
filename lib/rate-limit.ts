import { headers } from "next/headers";

// Sliding-window rate limiter — in-memory, single-process, zero
// dependencies. Deliberately complements, not duplicates, the existing
// Run/Submission locks (lib/run-lock.ts, ProgrammingSubmissionLock,
// SqlSubmissionLock): those stop a *second* request for the same
// (student, problem) while a *first* one is still in flight. They say
// nothing about how fast a student can fire request after request once each
// one completes — a fast query or a quick compile failure can clear a lock
// in milliseconds, letting a tight loop cycle through it dozens of times a
// minute without ever tripping "already in progress." This is the layer
// that catches that: it doesn't care about overlap, only about sustained
// request volume from one caller over a rolling window.
//
// Most actions are keyed by userId (below), since the caller is already
// authenticated by the time they run. Signup/login/password-reset happen
// *before* a session exists, so there's no userId to key on yet — those are
// keyed by client IP instead (see getClientIp below). Same limiter, same
// sliding-window logic, different key.

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

// Two categories, shared across the Programming and SQL variants of each —
// a student's SQL Run and Programming Run count toward the same "run"
// budget, since the abuse pattern (rapid repeated executions putting
// pressure on shared execution capacity) is the same either way.
export const RATE_LIMITS = {
  run: { windowMs: 60_000, max: 15 },
  submit: { windowMs: 60_000, max: 8 },
  // Admin bulk import (CSV or ZIP/file) — same "shared across Programming
  // and SQL" reasoning as run/submit above. This is a backstop against a
  // compromised admin credential doing rapid damage, not a defense against
  // normal usage: 5 imports in an hour is far above how often a real admin
  // bulk-uploads a problem set.
  bulkImport: { windowMs: 60 * 60_000, max: 5 },
  // Pre-auth flows, keyed by IP (see above). Generous enough that a shared
  // classroom/campus IP with several students signing up or logging in
  // around the same time is never a problem — tight enough that a script
  // attempting mass account creation or password guessing is.
  signup: { windowMs: 60 * 60_000, max: 500 },
  // Shared by both the student and admin login forms on purpose: an
  // attacker splitting guesses between /login and /admin/login from the
  // same IP should not get two independent budgets for what is the same
  // abuse pattern (password guessing) against the same origin.
  login: { windowMs: 15 * 60_000, max: 500 },
  passwordReset: { windowMs: 60 * 60_000, max: 500 },
  // Keyed by userId (the student is already authenticated at this point) —
  // a real "Buy Now" retry loop is a handful of clicks at most; this just
  // stops a scripted loop from creating an unbounded number of Razorpay
  // orders under one account.
  checkout: { windowMs: 60_000, max: 5 },
  // Keyed by IP, not userId — this endpoint has no session at all (Razorpay
  // calls it directly). Generous enough that Razorpay's own normal delivery
  // volume/retries are never affected; tight enough to bound a
  // garbage-signature spam attempt against a public endpoint, which
  // otherwise costs only a cheap HMAC check per request but could still run
  // up repeated logError→Sentry reports without a cap.
  webhook: { windowMs: 60_000, max: 60 },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitAction = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  /** How long until the oldest request in the current window ages out. */
  retryAfterMs: number;
}

const timestampsByKey = new Map<string, number[]>();

// Bounds unbounded Map growth from users who stop using the app: an entry
// idle longer than every configured window has already aged itself out of
// every possible check, so it's safe to forget entirely rather than keep an
// empty/stale array around forever.
const MAX_IDLE_MS = Math.max(...Object.values(RATE_LIMITS).map((c) => c.windowMs)) * 2;

// Lazy, amortized cleanup instead of a background timer — consistent with
// lib/run-lock.ts's style (no setInterval anywhere in that module either),
// and avoids relying on a timer surviving between requests, which isn't a
// safe assumption in every Node hosting environment.
const SWEEP_INTERVAL_CALLS = 200;
let callsSinceSweep = 0;

function sweepStaleKeys(now: number): void {
  callsSinceSweep += 1;
  if (callsSinceSweep < SWEEP_INTERVAL_CALLS) return;
  callsSinceSweep = 0;
  timestampsByKey.forEach((timestamps, key) => {
    const newest = timestamps[timestamps.length - 1];
    if (newest === undefined || now - newest > MAX_IDLE_MS) {
      timestampsByKey.delete(key);
    }
  });
}

/**
 * Sliding-window check: allows up to `max` requests in any rolling
 * `windowMs`-long period, not a fixed per-minute bucket — a burst straddling
 * a fixed-window boundary (e.g. many requests just before :00 and many more
 * just after) would slip through a naive fixed-window counter without ever
 * looking like sustained abuse. A sliding window doesn't have that gap.
 *
 * Never blocks on a single quick double-click: two requests a second apart
 * are far below any configured `max`, so normal fast iteration while
 * debugging is unaffected. Only sustained volume over the full window trips
 * the limit.
 */
export function checkRateLimit(action: RateLimitAction, key: string): RateLimitResult {
  if (process.env.DISABLE_RATE_LIMIT === "true") {
    return { allowed: true, retryAfterMs: 0 };
  }
  const config = RATE_LIMITS[action];
  const mapKey = `${action}:${key}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const existing = timestampsByKey.get(mapKey) ?? [];
  const recent = existing.filter((ts) => ts > windowStart);

  if (recent.length >= config.max) {
    timestampsByKey.set(mapKey, recent);
    const oldestInWindow = recent[0];
    return { allowed: false, retryAfterMs: Math.max(0, oldestInWindow + config.windowMs - now) };
  }

  recent.push(now);
  timestampsByKey.set(mapKey, recent);
  sweepStaleKeys(now);
  return { allowed: true, retryAfterMs: 0 };
}

// Best-effort client IP extraction for the pre-auth rate limits above. Server
// Actions have no access to the raw request socket the way a custom server
// would, so this reads the standard reverse-proxy headers instead. If
// neither is present (e.g. Node exposed directly with no proxy in front),
// every such request falls into one shared "unknown" bucket rather than
// bypassing the limit entirely — degraded, but still strictly better than no
// limit at all.
export function getClientIp(): string {
  const forwardedFor = headers().get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers().get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
