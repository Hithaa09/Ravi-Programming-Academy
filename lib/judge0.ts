// Judge0 integration — supports self-hosted and RapidAPI modes.
// JUDGE0_MODE=selfhosted (default) | rapidapi
// JUDGE0_URL=https://your-judge0-instance.com
// JUDGE0_TOKEN=your-auth-token
// JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com  (rapidapi mode only)

// ---------------------------------------------------------------------------
// Language IDs (Judge0 CE official)
// See: https://ce.judge0.com/languages/
// ---------------------------------------------------------------------------

// Maps the app's internal language IDs (from lib/languages.ts) to Judge0 IDs.
export const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  c:          50,   // C (GCC 9.2.0)
  cpp:        54,   // C++ (GCC 9.2.0)
  java:       62,   // Java (OpenJDK 13.0.1)
  python:     71,   // Python (3.8.1)
  javascript: 63,   // JavaScript (Node.js 12.14.0)
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

export interface SubmissionRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;    // seconds (default: Judge0 server default)
  memory_limit?: number;       // kilobytes
}

export interface SubmissionToken {
  token: string;
}

export interface SubmissionResult {
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

// Normalised result returned to callers — always resolved, never throws on
// Judge0-level errors (only on network/config errors).
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getConfig(): { baseUrl: string; headers: Record<string, string> } {
  const mode = (process.env.JUDGE0_MODE ?? "selfhosted").toLowerCase();
  const baseUrl = process.env.JUDGE0_URL;
  const token = process.env.JUDGE0_TOKEN;

  if (!baseUrl) throw new Error("JUDGE0_URL environment variable is not set.");
  if (!token) throw new Error("JUDGE0_TOKEN environment variable is not set.");

  if (mode === "rapidapi") {
    const host = process.env.JUDGE0_RAPIDAPI_HOST;
    if (!host) throw new Error("JUDGE0_RAPIDAPI_HOST is required when JUDGE0_MODE=rapidapi.");
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submit code for execution. Returns the submission token immediately
 * (non-blocking — the submission is queued on Judge0).
 */
export async function submitCode(
  sourceCode: string,
  languageId: number,
  stdin?: string,
  expectedOutput?: string
): Promise<string> {
  const { baseUrl, headers } = getConfig();

  const body: SubmissionRequest = {
    source_code: sourceCode,
    language_id: languageId,
    ...(stdin !== undefined && { stdin }),
    ...(expectedOutput !== undefined && { expected_output: expectedOutput }),
  };

  const res = await fetch(`${baseUrl}/submissions?base64_encoded=false&wait=false`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Judge0 submission failed: ${res.status} ${res.statusText}. ${text}`);
  }

  const data = (await res.json()) as SubmissionToken;
  if (!data.token) throw new Error("Judge0 returned no token in submission response.");
  return data.token;
}

/**
 * Poll a submission until it leaves the queue, then return the result.
 * Polls every 500 ms; times out after 10 s.
 */
export async function getSubmission(token: string): Promise<RunResult> {
  const { baseUrl, headers } = getConfig();
  const url = `${baseUrl}/submissions/${token}?base64_encoded=false`;

  const POLL_INTERVAL_MS = 500;
  const TIMEOUT_MS = 10_000;
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Judge0 fetch failed: ${res.status} ${res.statusText}. ${text}`);
    }

    const data = (await res.json()) as SubmissionResult;
    const statusId = data.status?.id ?? 0;

    // Status IDs 1 and 2 mean still in queue / processing — keep polling.
    if (statusId !== 1 && statusId !== 2) {
      return {
        status: data.status?.description ?? JUDGE0_STATUS[statusId] ?? "Unknown",
        statusId,
        accepted: statusId === 3,
        stdout: data.stdout,
        stderr: data.stderr,
        compile_output: data.compile_output,
        time: data.time,
        memory: data.memory,
      };
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`Judge0 submission timed out after ${TIMEOUT_MS / 1000}s (token: ${token}).`);
}

/**
 * Convenience: submit and wait for result in one call.
 */
export async function runCode(
  sourceCode: string,
  languageId: number,
  stdin?: string,
  expectedOutput?: string
): Promise<RunResult> {
  const token = await submitCode(sourceCode, languageId, stdin, expectedOutput);
  return getSubmission(token);
}
