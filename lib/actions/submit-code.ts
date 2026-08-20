"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getProblemById } from "@/lib/actions/programming-problems";
import { createProgrammingSubmission } from "@/lib/actions/programming-submissions";
import { runCode as executeOnJudge0, JUDGE0_LANGUAGE_IDS, type LanguageId } from "@/lib/judge0";
import { outputsMatch } from "@/lib/output-compare";
import { resolveExecutionLimits, type ResolvedExecutionLimits } from "@/lib/execution-limits";
import { checkRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/log";
import { hasLifetimeAccess } from "@/lib/payments/access";
import { getWrapperAdapter, encodeArgsAsStdin, resultsMatch, type FunctionSignature, type FunctionTestCase } from "@/lib/wrappers";
import type { TestCase } from "@/lib/types";

export interface SubmitProgrammingCodeInput {
  problemId: number;
  language: string;
  code: string;
}

export interface ProgrammingSubmitResult {
  verdict: string;
  passedTests: number;
  totalTests: number;
  executionTimeMs: number;
  memoryKb: number;
  stderr: string | null;
  compileOutput: string | null;
  error: string | null;
  // Only ever set on a "Wrong Answer" verdict when grading fell back to the
  // problem's visible test cases (no hidden cases configured) — the index
  // (0-based, into problem.testCases / functionTestCases) of the case that
  // failed, plus the raw output the student's own code produced for it. The
  // client already has that case's input/expected (visible cases are already
  // sent to it), so this reveals nothing new — grading against hidden cases
  // never sets this, since hidden case content must never reach the client.
  failedVisibleCase?: { index: number; actualOutput: string } | null;
}

function rejection(reason: string): ProgrammingSubmitResult {
  return {
    verdict: "Error",
    passedTests: 0,
    totalTests: 0,
    executionTimeMs: 0,
    memoryKb: 0,
    stderr: null,
    compileOutput: null,
    error: reason,
  };
}

function isSupportedLanguage(language: string): language is LanguageId {
  return Object.prototype.hasOwnProperty.call(JUDGE0_LANGUAGE_IDS, language);
}

async function gradeAgainstTestCases(
  code: string,
  languageId: number,
  testCases: TestCase[],
  limits: ResolvedExecutionLimits,
  // Only true when testCases is the problem's visible set (no hidden cases
  // configured) — see ProgrammingSubmitResult.failedVisibleCase.
  revealFailures: boolean
): Promise<ProgrammingSubmitResult> {
  let passedTests = 0;
  let lastExecutionTimeMs = 0;
  let lastMemoryKb = 0;
  // Judge0 CE has no first-class "Memory Limit Exceeded" status — exceeding
  // memory usually surfaces as a runtime error (commonly SIGSEGV) instead. A
  // runtime error whose reported memory is at/near the problem's configured
  // ceiling is classified as MLE rather than a generic crash.
  const mleThresholdKb = limits.memoryLimitKb * 0.9;

  for (let caseIndex = 0; caseIndex < testCases.length; caseIndex++) {
    const testCase = testCases[caseIndex];
    const run = await executeOnJudge0(code, languageId, {
      stdin: testCase.input,
      cpuTimeLimitSeconds: limits.cpuTimeLimitSeconds,
      memoryLimitKb: limits.memoryLimitKb,
    });

    if (!run.ok) {
      return {
        verdict: "Error",
        passedTests,
        totalTests: testCases.length,
        executionTimeMs: lastExecutionTimeMs,
        memoryKb: lastMemoryKb,
        stderr: null,
        compileOutput: null,
        error: "The code execution service failed. Please try again.",
      };
    }

    const { data } = run;
    lastExecutionTimeMs = data.time !== null ? Math.round(parseFloat(data.time) * 1000) : lastExecutionTimeMs;
    lastMemoryKb = data.memory ?? lastMemoryKb;

    if (data.statusId === 6) {
      return {
        verdict: "Compilation Error",
        passedTests: 0,
        totalTests: testCases.length,
        executionTimeMs: lastExecutionTimeMs,
        memoryKb: lastMemoryKb,
        stderr: null,
        compileOutput: data.compile_output,
        error: null,
      };
    }

    if (data.statusId === 5) {
      return {
        verdict: "Time Limit Exceeded",
        passedTests,
        totalTests: testCases.length,
        executionTimeMs: lastExecutionTimeMs,
        memoryKb: lastMemoryKb,
        stderr: null,
        compileOutput: null,
        error: null,
      };
    }

    if (data.statusId !== 3) {
      // Any other non-accepted status (7-14) is a runtime-error family
      // status. Treat it as Memory Limit Exceeded only when reported memory
      // is at/near our configured ceiling — otherwise it's a genuine crash.
      const verdict = lastMemoryKb >= mleThresholdKb ? "Memory Limit Exceeded" : "Runtime Error";
      return {
        verdict,
        passedTests,
        totalTests: testCases.length,
        executionTimeMs: lastExecutionTimeMs,
        memoryKb: lastMemoryKb,
        stderr: data.stderr,
        compileOutput: null,
        error: null,
      };
    }

    // Ran cleanly — token-compare actual output to expected (see
    // lib/output-compare.ts): tolerant of CRLF/trailing-space/blank-line
    // noise and near-identical floats, but still byte-exact for every
    // non-numeric token.
    if (!outputsMatch(data.stdout ?? "", testCase.expected)) {
      return {
        verdict: "Wrong Answer",
        passedTests,
        totalTests: testCases.length,
        executionTimeMs: lastExecutionTimeMs,
        memoryKb: lastMemoryKb,
        stderr: null,
        compileOutput: null,
        error: null,
        failedVisibleCase: revealFailures ? { index: caseIndex, actualOutput: data.stdout ?? "" } : null,
      };
    }

    passedTests++;
  }

  return {
    verdict: "Accepted",
    passedTests,
    totalTests: testCases.length,
    executionTimeMs: lastExecutionTimeMs,
    memoryKb: lastMemoryKb,
    stderr: null,
    compileOutput: null,
    error: null,
  };
}

// Parallel to gradeAgainstTestCases above, for Function Only problems. Kept
// as a separate function (rather than making the one above generic over the
// comparison strategy) so Full Program's grading path is never touched by
// Function Only changes — the compile/TLE/runtime-error classification is
// duplicated, but the two verdict paths can now evolve independently with
// zero regression risk to the other.
async function gradeAgainstFunctionTestCases(
  studentCode: string,
  languageId: number,
  sig: FunctionSignature,
  testCases: FunctionTestCase[],
  limits: ResolvedExecutionLimits,
  adapterRenderDriver: (sig: FunctionSignature, code: string) => string,
  // Only true when testCases is the problem's visible set (no hidden cases
  // configured) — see ProgrammingSubmitResult.failedVisibleCase.
  revealFailures: boolean
): Promise<ProgrammingSubmitResult> {
  let passedTests = 0;
  let lastExecutionTimeMs = 0;
  let lastMemoryKb = 0;
  const mleThresholdKb = limits.memoryLimitKb * 0.9;
  // Computed once, reused for every test case — the driver doesn't change
  // per case, only the stdin fed to it does.
  const sourceCode = adapterRenderDriver(sig, studentCode);

  for (let caseIndex = 0; caseIndex < testCases.length; caseIndex++) {
    const testCase = testCases[caseIndex];
    const run = await executeOnJudge0(sourceCode, languageId, {
      stdin: encodeArgsAsStdin(testCase.args),
      cpuTimeLimitSeconds: limits.cpuTimeLimitSeconds,
      memoryLimitKb: limits.memoryLimitKb,
    });

    if (!run.ok) {
      return {
        verdict: "Error",
        passedTests,
        totalTests: testCases.length,
        executionTimeMs: lastExecutionTimeMs,
        memoryKb: lastMemoryKb,
        stderr: null,
        compileOutput: null,
        error: "The code execution service failed. Please try again.",
      };
    }

    const { data } = run;
    lastExecutionTimeMs = data.time !== null ? Math.round(parseFloat(data.time) * 1000) : lastExecutionTimeMs;
    lastMemoryKb = data.memory ?? lastMemoryKb;

    if (data.statusId === 6) {
      return {
        verdict: "Compilation Error",
        passedTests: 0,
        totalTests: testCases.length,
        executionTimeMs: lastExecutionTimeMs,
        memoryKb: lastMemoryKb,
        stderr: null,
        compileOutput: data.compile_output,
        error: null,
      };
    }

    if (data.statusId === 5) {
      return {
        verdict: "Time Limit Exceeded",
        passedTests,
        totalTests: testCases.length,
        executionTimeMs: lastExecutionTimeMs,
        memoryKb: lastMemoryKb,
        stderr: null,
        compileOutput: null,
        error: null,
      };
    }

    if (data.statusId !== 3) {
      const verdict = lastMemoryKb >= mleThresholdKb ? "Memory Limit Exceeded" : "Runtime Error";
      return {
        verdict,
        passedTests,
        totalTests: testCases.length,
        executionTimeMs: lastExecutionTimeMs,
        memoryKb: lastMemoryKb,
        stderr: data.stderr,
        compileOutput: null,
        error: null,
      };
    }

    // Ran cleanly — parse the driver's single JSON-line output and compare
    // structurally against the admin-authored expected value (numeric
    // tolerance applied only to double/float leaves; see lib/wrappers/wire-format.ts).
    const comparison = resultsMatch(sig.returnType, data.stdout ?? "", testCase.expected);
    if (!comparison.match) {
      return {
        verdict: "Wrong Answer",
        passedTests,
        totalTests: testCases.length,
        executionTimeMs: lastExecutionTimeMs,
        memoryKb: lastMemoryKb,
        // Surfaced only when the driver's output couldn't be parsed as JSON
        // at all (e.g. NaN/Infinity from a double/float return, or stray
        // extra output) — distinct from a plain wrong value, so the student
        // isn't left guessing why a seemingly-correct answer failed.
        stderr: comparison.parseError ? `${comparison.parseError} (check for NaN/Infinity or any extra output your function/driver call printed)` : null,
        compileOutput: null,
        error: null,
        failedVisibleCase: revealFailures ? { index: caseIndex, actualOutput: data.stdout ?? "" } : null,
      };
    }

    passedTests++;
  }

  return {
    verdict: "Accepted",
    passedTests,
    totalTests: testCases.length,
    executionTimeMs: lastExecutionTimeMs,
    memoryKb: lastMemoryKb,
    stderr: null,
    compileOutput: null,
    error: null,
  };
}

// Grading a full test suite is never instant, but it should never take
// anywhere near this long either — a lock older than this is assumed to be
// left over from a crashed request, not a genuinely slow one, and is reclaimed
// rather than permanently blocking the student from ever submitting again.
const LOCK_STALE_MS = 30_000;

// Returns the acquired lock's ownership token (its createdAt), or null if
// not acquired. createdAt works as a per-acquisition token with no schema
// change needed: a reclaim can only happen after LOCK_STALE_MS has elapsed
// since the original row's createdAt, so the reclaiming create() is
// guaranteed a strictly later createdAt — the two can never collide. See
// releaseSubmissionLock for why this matters.
async function acquireSubmissionLock(studentId: string, problemId: number): Promise<Date | null> {
  const existing = await prisma.programmingSubmissionLock.findUnique({
    where: { studentId_problemId: { studentId, problemId } },
  });
  if (existing) {
    const age = Date.now() - existing.createdAt.getTime();
    if (age < LOCK_STALE_MS) return null;
    await prisma.programmingSubmissionLock
      .delete({ where: { studentId_problemId: { studentId, problemId } } })
      .catch(() => {});
  }
  try {
    const created = await prisma.programmingSubmissionLock.create({ data: { studentId, problemId } });
    return created.createdAt;
  } catch {
    // Lost a race against a concurrent request that created it first.
    return null;
  }
}

// Ownership-safe: only deletes the lock row if it's still the exact one this
// call acquired (matched by the createdAt token). Without this, a request
// that runs past LOCK_STALE_MS could delete a *different* request's lock —
// one that legitimately reclaimed the slot after this one went stale —
// opening a window for a third request to acquire while the second is still
// genuinely in progress. deleteMany (not delete) so a token mismatch simply
// deletes nothing rather than throwing.
async function releaseSubmissionLock(studentId: string, problemId: number, token: Date): Promise<void> {
  await prisma.programmingSubmissionLock
    .deleteMany({ where: { studentId, problemId, createdAt: token } })
    .catch(() => {});
}

/**
 * Grades student code against a problem's hidden test cases (falling back to
 * visible test cases if none are configured) and persists the result. Never
 * trusts client-supplied test data — the problem is always re-fetched here.
 */
export async function submitProgrammingCode(
  input: SubmitProgrammingCodeInput
): Promise<ProgrammingSubmitResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return rejection("You must be signed in to submit code.");

  if (!isSupportedLanguage(input.language)) {
    return rejection(`Unsupported language: ${input.language}`);
  }
  if (!input.code.trim()) {
    return rejection("Write some code before submitting.");
  }

  const problem = await getProblemById(input.problemId);
  if (!problem) return rejection("Problem not found.");
  // Admins are exempt — the admin "preview" pages reuse this same Submit
  // action to let admins test-grade a problem while it's still
  // Draft/Locked, before publishing. Their test submissions still get
  // recorded (createProgrammingSubmission below), but leaderboard/dashboard
  // aggregation already filters to role: "student", so this never pollutes
  // student-facing stats.
  const role = user.app_metadata?.role;
  const isAdmin = role === "admin";
  if (!isAdmin && (problem.status !== "Published" || problem.availability === "Locked")) {
    return rejection("This problem is not currently available.");
  }
  // Same admin exemption as above — enforced here too, not just on the solve
  // page, since this action is independently callable with any problemId.
  if (!isAdmin && problem.accessType === "PREMIUM" && !(await hasLifetimeAccess(user.id))) {
    return rejection("This is a premium problem. Purchase access to continue.");
  }

  // Checked before the lock, and before anything that costs real resources
  // (Judge0). The lock only stops overlapping submissions for this one
  // problem; this catches sustained rapid-fire Submit requests across ANY
  // problems, which a fast grading run can cycle through the lock without
  // ever tripping it. See lib/rate-limit.ts.
  const rateLimit = checkRateLimit("submit", user.id);
  if (!rateLimit.allowed) {
    return rejection("You're submitting too frequently. Please wait a moment and try again.");
  }

  const lockToken = await acquireSubmissionLock(user.id, input.problemId);
  if (!lockToken) {
    return rejection("You already have a submission in progress for this problem. Please wait for it to finish.");
  }

  try {
    const limits = resolveExecutionLimits(problem);
    let result: ProgrammingSubmitResult;

    if (problem.executionStyle === "FUNCTION_ONLY") {
      const adapter = getWrapperAdapter(input.language);
      const gradingCases = problem.functionHiddenTestCases.length > 0 ? problem.functionHiddenTestCases : problem.functionTestCases;
      if (!adapter) {
        result = { ...rejection("This language isn't supported for this problem."), error: "This language isn't supported for this problem." };
      } else if (!problem.functionSignature) {
        result = { ...rejection("This problem has no function signature configured."), error: "This problem has no function signature configured." };
      } else if (gradingCases.length === 0) {
        result = { ...rejection("This problem has no test cases configured."), error: "This problem has no test cases configured." };
      } else {
        result = await gradeAgainstFunctionTestCases(
          input.code,
          JUDGE0_LANGUAGE_IDS[input.language],
          problem.functionSignature,
          gradingCases,
          limits,
          adapter.renderDriver,
          problem.functionHiddenTestCases.length === 0
        );
      }
    } else {
      const gradingCases = problem.hiddenTestCases.length > 0 ? problem.hiddenTestCases : problem.testCases;
      result =
        gradingCases.length === 0
          ? { ...rejection("This problem has no test cases configured."), error: "This problem has no test cases configured." }
          : await gradeAgainstTestCases(input.code, JUDGE0_LANGUAGE_IDS[input.language], gradingCases, limits, problem.hiddenTestCases.length === 0);
    }

    // Persist best-effort — a storage failure shouldn't hide the graded result from the student.
    try {
      await createProgrammingSubmission({
        studentId: user.id,
        studentEmail: user.email ?? "",
        problemId: input.problemId,
        problemTitle: problem.title,
        language: input.language,
        code: input.code,
        verdict: result.verdict,
        executionTimeMs: result.executionTimeMs,
        memoryKb: result.memoryKb,
        passedTests: result.passedTests,
        totalTests: result.totalTests,
      });
    } catch (e) {
      logError("submitProgrammingCode: failed to store submission", {
        userId: user.id,
        context: { problemId: input.problemId, error: e instanceof Error ? e.message : String(e) },
      });
    }

    return result;
  } finally {
    await releaseSubmissionLock(user.id, input.problemId, lockToken);
  }
}
