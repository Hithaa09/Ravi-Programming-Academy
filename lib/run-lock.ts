import { randomUUID } from "crypto";

// In-memory per-(student, problem) lock preventing overlapping Run requests
// — rapid re-clicks, double-clicks, or multiple browser tabs all hitting Run
// at once for the same problem. Deliberately separate from the DB-backed
// ProgrammingSubmissionLock/SqlSubmissionLock: Run never writes grading data,
// so there's nothing to protect if state resets on a redeploy/restart, and a
// plain in-memory map avoids a DB round trip on what's a much hotter path
// than Submit (students iterate with Run far more than they click Submit).
const STALE_MS = 30_000; // mirrors the Submit locks' stale-reclaim window

export interface RunLock {
  /** Returns an ownership token if acquired, or null if already locked. */
  acquire(studentId: string, problemId: number): string | null;
  /** Only releases the lock if `token` still matches the current holder. */
  release(studentId: string, problemId: number, token: string): void;
}

export function createRunLock(): RunLock {
  const inProgress = new Map<string, { startedAt: number; token: string }>();

  function acquire(studentId: string, problemId: number): string | null {
    const key = `${studentId}:${problemId}`;
    const existing = inProgress.get(key);
    if (existing !== undefined && Date.now() - existing.startedAt < STALE_MS) {
      return null;
    }
    // A fresh random token every acquisition — including reclaims — so a
    // reclaimed lock is unambiguously distinct from the one it replaced.
    const token = randomUUID();
    inProgress.set(key, { startedAt: Date.now(), token });
    return token;
  }

  function release(studentId: string, problemId: number, token: string): void {
    // Ownership-safe: only clears the entry if `token` still matches. Without
    // this, a request that runs past STALE_MS could delete a *different*
    // request's lock — one that legitimately reclaimed the slot after this
    // one went stale — opening a window for a third request to acquire while
    // the second is still genuinely in progress.
    const key = `${studentId}:${problemId}`;
    const existing = inProgress.get(key);
    if (existing && existing.token === token) {
      inProgress.delete(key);
    }
  }

  return { acquire, release };
}
