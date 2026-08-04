"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { runSqlIsolated } from "@/lib/sql/run-isolated";
import { compareSqlResults } from "@/lib/sql/comparator";
import { runHiddenDatasets } from "@/lib/sql/hidden-runner";
import { createSqlSubmission } from "@/lib/actions/sql-submissions";
import { getSqlProblemById } from "@/lib/actions/sql-problems";
import { checkRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/log";
import { hasLifetimeAccess } from "@/lib/payments/access";

export interface SubmitSqlInput {
  problemId: number;
  query: string;
}

export interface SubmitSqlResult {
  correct: boolean;
  reason?: string;
  executionTimeMs: number;
  rowsReturned: number;
  passedDatasets: number;
  totalDatasets: number;
  error?: string;
}

function rejection(reason: string): SubmitSqlResult {
  return {
    correct: false,
    reason,
    executionTimeMs: 0,
    rowsReturned: 0,
    passedDatasets: 0,
    totalDatasets: 0,
    error: reason,
  };
}

// Mirrors submit-code.ts's ProgrammingSubmissionLock exactly — see that file
// for the full reasoning. A lock older than this is assumed to be left over
// from a crashed request, not a genuinely slow one, and is reclaimed.
const LOCK_STALE_MS = 30_000;

// Returns the acquired lock's ownership token (its createdAt), or null if
// not acquired. See submit-code.ts's acquireSubmissionLock for why createdAt
// is safe to use as a per-acquisition token with no schema change.
async function acquireSubmissionLock(studentId: string, problemId: number): Promise<Date | null> {
  const existing = await prisma.sqlSubmissionLock.findUnique({
    where: { studentId_problemId: { studentId, problemId } },
  });
  if (existing) {
    const age = Date.now() - existing.createdAt.getTime();
    if (age < LOCK_STALE_MS) return null;
    await prisma.sqlSubmissionLock
      .delete({ where: { studentId_problemId: { studentId, problemId } } })
      .catch(() => {});
  }
  try {
    const created = await prisma.sqlSubmissionLock.create({ data: { studentId, problemId } });
    return created.createdAt;
  } catch {
    // Lost a race against a concurrent request that created it first.
    return null;
  }
}

// Ownership-safe: only deletes the lock row if it's still the exact one this
// call acquired — see submit-code.ts's releaseSubmissionLock for the full
// reasoning. deleteMany (not delete) so a token mismatch deletes nothing
// rather than throwing.
async function releaseSubmissionLock(studentId: string, problemId: number, token: Date): Promise<void> {
  await prisma.sqlSubmissionLock
    .deleteMany({ where: { studentId, problemId, createdAt: token } })
    .catch(() => {});
}

export async function submitSqlAction(input: SubmitSqlInput): Promise<SubmitSqlResult> {
  // Reject unauthenticated callers before any SQL execution.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return rejection("Not authenticated.");

  // Grading data (schema, expected output, hidden datasets) is always
  // re-fetched here rather than trusted from the client — the client only
  // supplies the problemId and the query text. Trusting client-supplied
  // hidden datasets/expected output would let a tampered request forge an
  // "Accepted" verdict, and would also mean the confidential answer key had
  // to be shipped to the browser in the first place.
  const problem = await getSqlProblemById(input.problemId);
  if (!problem) return rejection("Problem not found.");
  // Admins are exempt — see the identical comment in submit-code.ts.
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

  // Checked before the lock, and before the SQL worker semaphore/fork —
  // catches sustained rapid-fire Submit requests across ANY problems, which
  // a fast grading run can cycle through the lock without ever tripping it.
  // See lib/rate-limit.ts.
  const rateLimit = checkRateLimit("submit", user.id);
  if (!rateLimit.allowed) {
    return rejection("You're submitting too frequently. Please wait a moment and try again.");
  }

  const lockToken = await acquireSubmissionLock(user.id, input.problemId);
  if (!lockToken) {
    return rejection("You already have a submission in progress for this problem. Please wait for it to finish.");
  }

  try {
    let result: SubmitSqlResult;

    // Path A: hidden datasets present — run against every dataset, stop on first failure.
    if (problem.hiddenDatasets.length > 0) {
      const hidden = await runHiddenDatasets({
        datasets: problem.hiddenDatasets,
        fallbackSchemaSql: problem.schemaSql,
        query: input.query,
        ignoreRowOrder: problem.ignoreRowOrder,
        ignoreColumnOrder: problem.ignoreColumnOrder,
      });
      result = {
        correct: hidden.correct,
        reason: hidden.reason,
        executionTimeMs: hidden.executionTimeMs,
        rowsReturned: hidden.rowsReturned,
        passedDatasets: hidden.passedDatasets,
        totalDatasets: hidden.totalDatasets,
        error: hidden.error,
      };
    } else {
      // Path B: no hidden datasets — compare against sample expected output.
      const run = await runSqlIsolated({
        schemaSql: problem.schemaSql,
        sampleDataSql: problem.sampleDataSql,
        query: input.query,
      });

      if (run.error) {
        result = {
          correct: false,
          reason: run.error,
          executionTimeMs: run.executionTimeMs,
          rowsReturned: 0,
          passedDatasets: 0,
          totalDatasets: 1,
          error: run.error,
        };
      } else if (problem.expectedResultColumns.length === 0) {
        // No expected output configured — accept any non-erroring query.
        result = {
          correct: true,
          executionTimeMs: run.executionTimeMs,
          rowsReturned: run.rows.length,
          passedDatasets: 1,
          totalDatasets: 1,
        };
      } else {
        const comparison = compareSqlResults({
          studentColumns: run.columns,
          studentRows: run.rows,
          expectedColumns: problem.expectedResultColumns,
          expectedRows: problem.expectedResultRows,
          ignoreRowOrder: problem.ignoreRowOrder,
          ignoreColumnOrder: problem.ignoreColumnOrder,
        });
        result = {
          correct: comparison.correct,
          reason: comparison.correct ? undefined : comparison.reason,
          executionTimeMs: run.executionTimeMs,
          rowsReturned: run.rows.length,
          passedDatasets: comparison.correct ? 1 : 0,
          totalDatasets: 1,
        };
      }
    }

    // Store the submission (best-effort; never fails the response).
    try {
      const verdict = result.error ? "Error" : result.correct ? "Accepted" : "Wrong Answer";
      await createSqlSubmission({
        studentId: user.id,
        studentEmail: user.email ?? "",
        problemId: input.problemId,
        problemTitle: problem.title,
        query: input.query,
        verdict,
        executionTimeMs: result.executionTimeMs,
        passedDatasets: result.passedDatasets,
        totalDatasets: result.totalDatasets,
      });
    } catch (e) {
      logError("submitSqlAction: failed to store submission", {
        userId: user.id,
        context: { problemId: input.problemId, error: e instanceof Error ? e.message : String(e) },
      });
    }

    return result;
  } finally {
    await releaseSubmissionLock(user.id, input.problemId, lockToken);
  }
}
