"use server";

import { createClient } from "@/lib/supabase/server";
import { getProblemById } from "@/lib/actions/programming-problems";
import { runCode as executeOnJudge0, JUDGE0_LANGUAGE_IDS, type LanguageId, type Judge0ErrorKind } from "@/lib/judge0";
import { resolveExecutionLimits } from "@/lib/execution-limits";
import { createRunLock } from "@/lib/run-lock";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasLifetimeAccess } from "@/lib/payments/access";
import { getWrapperAdapter } from "@/lib/wrappers";

const runLock = createRunLock();

export interface ProgrammingRunResult {
  ok: boolean;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  // Human-readable Judge0 status (e.g. "Time Limit Exceeded", "Runtime Error
  // (SIGSEGV)") — only set when the run did not simply execute cleanly.
  // Never a pass/fail verdict: Run does not compare against expected output.
  statusLabel: string | null;
  executionTimeMs: number | null;
  memoryKb: number | null;
  error: string | null;
}

export interface RunProgrammingCodeInput {
  problemId: number;
  language: string;
  code: string;
  stdin?: string;
}

function rejection(message: string): ProgrammingRunResult {
  return {
    ok: false,
    stdout: null,
    stderr: null,
    compileOutput: null,
    statusLabel: null,
    executionTimeMs: null,
    memoryKb: null,
    error: message,
  };
}

function isSupportedLanguage(language: string): language is LanguageId {
  return Object.prototype.hasOwnProperty.call(JUDGE0_LANGUAGE_IDS, language);
}

function judge0ErrorMessage(kind: Judge0ErrorKind): string {
  switch (kind) {
    case "config":
      return "Code execution is not configured yet. Please contact an administrator.";
    case "timeout":
      return "Execution took too long and timed out. Please try again.";
    case "network":
      return "Could not reach the code execution service. Please try again.";
    case "http":
      return "The code execution service returned an error. Please try again.";
    case "invalid_response":
      return "Received an unexpected response from the code execution service.";
    default:
      return "Code execution failed. Please try again.";
  }
}

/**
 * Executes student code via Judge0 and returns the raw result. Does not
 * grade, compare against expected output, or persist anything — pure
 * execution, same as clicking "Run" on the editor.
 */
export async function runProgrammingCode(input: RunProgrammingCodeInput): Promise<ProgrammingRunResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return rejection("You must be signed in to run code.");

  if (!isSupportedLanguage(input.language)) {
    return rejection(`Unsupported language: ${input.language}`);
  }

  if (!input.code.trim()) {
    return rejection("Write some code before running.");
  }

  // Not a trust boundary the way Submit's grading data is — Run never
  // compares output — but the problem's configured limits still need to
  // come from the server, not the client, and Run should be gated by the
  // same Published/Available check Submit already enforces. Admins are
  // exempt: the admin "preview" pages reuse this same Run action to let
  // admins test a problem while it's still Draft/Locked, before publishing.
  const problem = await getProblemById(input.problemId);
  if (!problem) return rejection("Problem not found.");
  const role = user.app_metadata?.role;
  const isAdmin = role === "admin";
  if (!isAdmin && (problem.status !== "Published" || problem.availability === "Locked")) {
    return rejection("This problem is not currently available.");
  }
  // Same admin exemption as the Published/Locked check above — enforced here
  // too, not just on the solve page, since this action is independently
  // callable with any problemId regardless of what the UI shows.
  if (!isAdmin && problem.accessType === "PREMIUM" && !(await hasLifetimeAccess(user.id))) {
    return rejection("This is a premium problem. Purchase access to continue.");
  }
  // Function Only: splice the student's function body into the generated
  // driver before sending to Judge0. The client already built `stdin` itself
  // via encodeArgsAsStdin (the visible test case it's rendering is not
  // secret — Run never grades/compares, so this mirrors Full Program's
  // existing trust model where the client already sends the visible case's
  // raw stdin directly).
  let sourceCode = input.code;
  if (problem.executionStyle === "FUNCTION_ONLY") {
    const adapter = getWrapperAdapter(input.language);
    if (!adapter) return rejection("This language isn't supported for this problem.");
    if (!problem.functionSignature) return rejection("This problem has no function signature configured.");
    sourceCode = adapter.renderDriver(problem.functionSignature, input.code);
  }

  const limits = resolveExecutionLimits(problem);

  // Checked before the lock, and before anything that costs real resources
  // (Judge0). The lock only stops overlapping requests for this one problem;
  // this catches sustained rapid-fire Run requests across ANY problems,
  // which a fast-completing request can cycle through the lock without ever
  // tripping it.
  const rateLimit = checkRateLimit("run", user.id);
  if (!rateLimit.allowed) {
    return rejection("You're running code too frequently. Please wait a moment and try again.");
  }

  // Prevents overlapping Run requests for the same student+problem — rapid
  // re-clicks or multiple tabs hitting Run at once. Scoped per-problem, not
  // globally, so running a different problem in another tab is unaffected.
  // Submit has its own separate lock (ProgrammingSubmissionLock) and is
  // untouched by this — the two never block each other.
  const lockToken = runLock.acquire(user.id, input.problemId);
  if (!lockToken) {
    return rejection("A run is already in progress for this problem. Please wait for it to finish.");
  }

  try {
    const result = await executeOnJudge0(sourceCode, JUDGE0_LANGUAGE_IDS[input.language], {
      stdin: input.stdin,
      cpuTimeLimitSeconds: limits.cpuTimeLimitSeconds,
      memoryLimitKb: limits.memoryLimitKb,
    });

    if (!result.ok) {
      return rejection(judge0ErrorMessage(result.error.kind));
    }

    const { data } = result;
    return {
      ok: true,
      stdout: data.stdout,
      stderr: data.stderr,
      compileOutput: data.compile_output,
      statusLabel: data.statusId === 3 ? null : data.status,
      executionTimeMs: data.time !== null ? Math.round(parseFloat(data.time) * 1000) : null,
      memoryKb: data.memory,
      error: null,
    };
  } finally {
    runLock.release(user.id, input.problemId, lockToken);
  }
}
