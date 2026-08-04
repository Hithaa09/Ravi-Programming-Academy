"use server";

import { createClient } from "@/lib/supabase/server";
import { getSqlProblemById } from "@/lib/actions/sql-problems";
import { runSqlIsolated } from "@/lib/sql/run-isolated";
import type { SqlRunResult } from "@/lib/sql/types";
import { createRunLock } from "@/lib/run-lock";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasLifetimeAccess } from "@/lib/payments/access";

const runLock = createRunLock();

export interface RunSqlActionInput {
  problemId: number;
  query: string;
}

export async function runSqlAction(input: RunSqlActionInput): Promise<SqlRunResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated.", executionTimeMs: 0, columns: [], rows: [] };

  // Same trust boundary as submitSqlAction: schema/sample data always comes
  // from the server-fetched problem, never trusted from the client. Admins
  // are exempt from the Published/Available gate — the admin "preview" pages
  // reuse this same Run action to test a problem while it's still
  // Draft/Locked, before publishing.
  const problem = await getSqlProblemById(input.problemId);
  if (!problem) return { error: "Problem not found.", executionTimeMs: 0, columns: [], rows: [] };
  const role = user.app_metadata?.role;
  const isAdmin = role === "admin";
  if (!isAdmin && (problem.status !== "Published" || problem.availability === "Locked")) {
    return { error: "This problem is not currently available.", executionTimeMs: 0, columns: [], rows: [] };
  }
  // Same admin exemption as above — enforced here too, not just on the solve
  // page, since this action is independently callable with any problemId.
  if (!isAdmin && problem.accessType === "PREMIUM" && !(await hasLifetimeAccess(user.id))) {
    return { error: "This is a premium problem. Purchase access to continue.", executionTimeMs: 0, columns: [], rows: [] };
  }

  // Checked before the lock, and before the SQL worker semaphore/fork —
  // catches sustained rapid-fire Run requests across ANY problems, which a
  // fast-completing query can cycle through the lock without ever tripping
  // it. See lib/rate-limit.ts for why this doesn't duplicate the lock.
  const rateLimit = checkRateLimit("run", user.id);
  if (!rateLimit.allowed) {
    return { error: "You're running code too frequently. Please wait a moment and try again.", executionTimeMs: 0, columns: [], rows: [] };
  }

  // Prevents overlapping Run requests for the same student+problem — rapid
  // re-clicks or multiple tabs hitting Run at once. Scoped per-problem, not
  // globally, so running a different problem in another tab is unaffected.
  // Submit has its own separate lock (SqlSubmissionLock) and is untouched by
  // this — the two never block each other.
  const lockToken = runLock.acquire(user.id, input.problemId);
  if (!lockToken) {
    return { error: "A run is already in progress for this problem. Please wait for it to finish.", executionTimeMs: 0, columns: [], rows: [] };
  }

  try {
    return await runSqlIsolated({
      schemaSql: problem.schemaSql,
      sampleDataSql: problem.sampleDataSql,
      query: input.query,
    });
  } finally {
    runLock.release(user.id, input.problemId, lockToken);
  }
}
