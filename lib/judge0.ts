// Judge0 integration — supports self-hosted and RapidAPI modes.
// JUDGE0_MODE=selfhosted (default) | rapidapi
// JUDGE0_URL=https://your-judge0-instance.com
// JUDGE0_TOKEN=your-auth-token
// JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com  (rapidapi mode only)
//
// Every public function returns a Judge0Result<T> — { ok: true, data } or
// { ok: false, error } — instead of throwing, so callers (server actions,
// future features) can handle failures without try/catch. Transient network
// failures (timeouts, connection errors, 429/5xx responses) are retried with
// backoff before being surfaced as an error.

import { CODE_LANGUAGES } from "@/lib/languages";

// ---------------------------------------------------------------------------
// Language IDs (Judge0 CE official)
// See: https://ce.judge0.com/languages/
// ---------------------------------------------------------------------------

export type LanguageId = (typeof CODE_LANGUAGES)[number]["id"];

// Maps the app's internal language IDs (from lib/languages.ts) to Judge0 IDs.
export const JUDGE0_LANGUAGE_IDS: Record<LanguageId, number> = {
  c:          50,   // C (GCC 9.2.0)
  cpp:        54,   // C++ (GCC 9.2.0)
  java:       62,   // Java (OpenJDK 13.0.1)
  python:     71,   // Python (3.8.1)
  javascript: 102,  // JavaScript (Node.js 22.08.0) — id 63 (Node 12.14.0) lacks optional chaining (?.) and nullish coalescing (??)
  perl:       85,   // Perl (5.28.1)

  // ⚠️  VB WARNING: Judge0 CE language ID 84 runs "Visual Basic.Net (vbnc 0.0.0.5943)".
  // vbnc is the Mono Visual Basic compiler, an abandoned project (last release 2013).
  // It lacks support for most modern VB.Net syntax (LINQ, async/await, string interpolation,
  // many framework types). Code written for standard VB.Net / .NET 5+ will likely fail
  // to compile. If your students write modern VB.Net, this will be unreliable.
  // If your Judge0 instance was built with a newer language list, check /languages for
  // a more current VB compiler (there may not be one — VB support in Judge0 is poor).
  vb:         84,
};

// Human-readable Judge0 status labels (status.id from submission response)
export const JUDGE0_STATUS: Record<number, string> = {
  1:  "In Queue",
  2:  "Processing",
  3:  "Accepted",
  4:  "Wrong Answer",
  5:  "Time Limit Exceeded",
  6:  "Compilation Error",
  7:  "Runtime Error (SIGSEGV)",
  8:  "Runtime Error (SIGXFSZ)",
  9:  "Runtime Error (SIGFPE)",
  10: "Runtime Error (SIGABRT)",
  11: "Runtime Error (NZEC)",
  12: "Runtime Error (Other)",
  13: "Internal Error",
  14: "Exec Format Error",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubmissionRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;    // seconds (default: Judge0 server default)
  memory_limit?: number;       // kilobytes
}

interface SubmissionToken {
  token: string;
}

interface SubmissionResult {
  token: string;
  status: {
    id: number;
    description: string;
  };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;       // seconds as string, e.g. "0.042"
  memory: number | null;     // kilobytes
  exit_code: number | null;
  exit_signal: number | null;
  wall_time: string | null;
}

// Normalised result for a finished submission (statusId no longer 1/2).
export interface RunResult {
  status: string;             // human-readable status description
  statusId: number;
  accepted: boolean;          // true only when statusId === 3
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
}

// Extra per-submission overrides, on top of the Judge0 server defaults.
export interface RunCodeOptions {
  stdin?: string;
  expectedOutput?: string;
  cpuTimeLimitSeconds?: number;
  memoryLimitKb?: number;
}

export type Judge0ErrorKind =
  | "config"            // missing/invalid environment variables
  | "network"           // fetch failed or timed out, even after retries
  | "http"              // Judge0 responded with a non-2xx status
  | "timeout"           // polling exceeded the overall deadline
  | "invalid_response"; // malformed or unexpected response body

export interface Judge0Error {
  kind: Judge0ErrorKind;
  message: string;
  status?: number; // HTTP status code, when kind === "http"
}

export type Judge0Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: Judge0Error };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

class Judge0ConfigError extends Error {}

function getConfig(): { baseUrl: string; headers: Record<string, string> } {
  const mode = (process.env.JUDGE0_MODE ?? "selfhosted").toLowerCase();
  const baseUrl = process.env.JUDGE0_URL;
  const token = process.env.JUDGE0_TOKEN;

  if (!baseUrl) throw new Judge0ConfigError("JUDGE0_URL environment variable is not set.");
  if (!token) throw new Judge0ConfigError("JUDGE0_TOKEN environment variable is not set.");

  if (mode === "rapidapi") {
    const host = process.env.JUDGE0_RAPIDAPI_HOST;
    if (!host) throw new Judge0ConfigError("JUDGE0_RAPIDAPI_HOST is required when JUDGE0_MODE=rapidapi.");
    return {
      baseUrl: baseUrl.replace(/\/$/, ""),
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": token,
        "X-RapidAPI-Host": host,
      },
    };
  }

  // Self-hosted — Judge0 accepts the token as a bare Authorization header.
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    headers: {
      "Content-Type": "application/json",
      "Authorization": token,
    },
  };
}

const MAX_RETRIES = 2;              // up to 3 attempts total
const RETRY_BASE_DELAY_MS = 300;    // doubles each retry
const FETCH_TIMEOUT_MS = 8_000;     // per-attempt hang guard

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 429 (rate limited) and 5xx (server-side) are treated as transient.
// 4xx other than 429 (bad request, bad key, etc.) are not retried — retrying
// them would just repeat the same failure.
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

// Wraps fetch with a per-attempt timeout and retries transient failures
// (network errors, aborts, 429/5xx) with exponential backoff. Non-transient
// HTTP errors are returned as-is for the caller to inspect.
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (isRetryableStatus(res.status) && attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Network request to Judge0 failed.");
}

// Judge0 warns against sending/receiving raw (non-base64) text — certain
// byte sequences fail its UTF-8 validation even when the source is plain
// ASCII with escaped characters. Base64 round-tripping avoids that entirely
// and is what Judge0's own docs recommend.
function toBase64(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64");
}

function fromBase64(text: string | null): string | null {
  return text === null ? null : Buffer.from(text, "base64").toString("utf-8");
}

function toJudge0Error(err: unknown): Judge0Error {
  if (err instanceof Judge0ConfigError) {
    return { kind: "config", message: err.message };
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return { kind: "network", message: "Judge0 request timed out." };
  }
  return {
    kind: "network",
    message: err instanceof Error ? err.message : "Network request to Judge0 failed.",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submit code for execution. Resolves with the submission token immediately
 * (non-blocking — the submission is queued on Judge0).
 */
export async function submitCode(
  sourceCode: string,
  languageId: number,
  options: RunCodeOptions = {}
): Promise<Judge0Result<string>> {
  try {
    const { baseUrl, headers } = getConfig();

    const body: SubmissionRequest = {
      source_code: toBase64(sourceCode),
      language_id: languageId,
      ...(options.stdin !== undefined && { stdin: toBase64(options.stdin) }),
      ...(options.expectedOutput !== undefined && { expected_output: toBase64(options.expectedOutput) }),
      ...(options.cpuTimeLimitSeconds !== undefined && { cpu_time_limit: options.cpuTimeLimitSeconds }),
      ...(options.memoryLimitKb !== undefined && { memory_limit: options.memoryLimitKb }),
    };

    const res = await fetchWithRetry(`${baseUrl}/submissions?base64_encoded=true&wait=false`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: { kind: "http", status: res.status, message: `Judge0 submission failed: ${res.status} ${res.statusText}. ${text}` },
      };
    }

    const data = (await res.json().catch(() => null)) as SubmissionToken | null;
    if (!data?.token) {
      return { ok: false, error: { kind: "invalid_response", message: "Judge0 returned no token in submission response." } };
    }

    return { ok: true, data: data.token };
  } catch (err) {
    return { ok: false, error: toJudge0Error(err) };
  }
}

/**
 * Poll a submission until it leaves the queue, then return the normalised
 * result. Polls every 500 ms; gives up after 10 s of polling.
 */
export async function getSubmission(token: string): Promise<Judge0Result<RunResult>> {
  try {
    const { baseUrl, headers } = getConfig();
    const url = `${baseUrl}/submissions/${token}?base64_encoded=true`;

    const POLL_INTERVAL_MS = 500;
    const TIMEOUT_MS = 10_000;
    const deadline = Date.now() + TIMEOUT_MS;

    while (Date.now() < deadline) {
      const res = await fetchWithRetry(url, { headers, cache: "no-store" });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          ok: false,
          error: { kind: "http", status: res.status, message: `Judge0 fetch failed: ${res.status} ${res.statusText}. ${text}` },
        };
      }

      const data = (await res.json().catch(() => null)) as SubmissionResult | null;
      if (!data) {
        return { ok: false, error: { kind: "invalid_response", message: "Judge0 returned an unparsable submission response." } };
      }

      const statusId = data.status?.id ?? 0;

      // Status IDs 1 and 2 mean still in queue / processing — keep polling.
      if (statusId !== 1 && statusId !== 2) {
        return {
          ok: true,
          data: {
            status: data.status?.description ?? JUDGE0_STATUS[statusId] ?? "Unknown",
            statusId,
            accepted: statusId === 3,
            stdout: fromBase64(data.stdout),
            stderr: fromBase64(data.stderr),
            compile_output: fromBase64(data.compile_output),
            time: data.time,
            memory: data.memory,
          },
        };
      }

      await sleep(POLL_INTERVAL_MS);
    }

    return { ok: false, error: { kind: "timeout", message: `Judge0 submission timed out after ${TIMEOUT_MS / 1000}s (token: ${token}).` } };
  } catch (err) {
    return { ok: false, error: toJudge0Error(err) };
  }
}

/**
 * Convenience: submit and wait for the result in one call.
 */
export async function runCode(
  sourceCode: string,
  languageId: number,
  options: RunCodeOptions = {}
): Promise<Judge0Result<RunResult>> {
  const submitted = await submitCode(sourceCode, languageId, options);
  if (!submitted.ok) return submitted;
  return getSubmission(submitted.data);
}

/**
 * Lightweight reachability check for the /health endpoint only — not used
 * anywhere in the actual grading path. Hits /languages (a cheap read, never
 * queues a submission or occupies a worker slot) with a short timeout, so a
 * hung Judge0 instance can't make /health hang too.
 */
export async function checkJudge0Health(): Promise<Judge0Result<true>> {
  try {
    const { baseUrl, headers } = getConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3_000);

    try {
      const res = await fetch(`${baseUrl}/languages`, { headers, signal: controller.signal, cache: "no-store" });
      if (!res.ok) {
        return { ok: false, error: { kind: "http", status: res.status, message: `Judge0 health check failed: ${res.status} ${res.statusText}` } };
      }
      return { ok: true, data: true };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    return { ok: false, error: toJudge0Error(err) };
  }
}
