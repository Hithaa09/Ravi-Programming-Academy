"use server";

import { createClient } from "@/lib/supabase/server";
import { runSql } from "@/lib/sql/runner";
import { compareSqlResults } from "@/lib/sql/comparator";
import { runHiddenDatasets } from "@/lib/sql/hidden-runner";
import { createSqlSubmission } from "@/lib/actions/sql-submissions";
import type { SqlHiddenDataset } from "@/lib/types";

export interface SubmitSqlInput {
  problemId: number;
  problemTitle: string;
  schemaSql: string | null;
  sampleDataSql: string | null;
  query: string;
  expectedColumns: string[];
  expectedRows: string[][];
  hiddenDatasets: SqlHiddenDataset[];
  ignoreRowOrder: boolean;
  ignoreColumnOrder: boolean;
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

export async function submitSqlAction(input: SubmitSqlInput): Promise<SubmitSqlResult> {
  // Reject unauthenticated callers before any SQL execution.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      correct: false,
      reason: "Not authenticated.",
      executionTimeMs: 0,
      rowsReturned: 0,
      passedDatasets: 0,
      totalDatasets: 0,
      error: "Not authenticated.",
    };
  }

  let result: SubmitSqlResult;

  // Path A: hidden datasets present — run against every dataset, stop on first failure.
  if (input.hiddenDatasets.length > 0) {
    const hidden = runHiddenDatasets({
      datasets: input.hiddenDatasets,
      fallbackSchemaSql: input.schemaSql,
      query: input.query,
      ignoreRowOrder: input.ignoreRowOrder,
      ignoreColumnOrder: input.ignoreColumnOrder,
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
    const run = runSql({
      schemaSql: input.schemaSql,
      sampleDataSql: input.sampleDataSql,
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
    } else if (input.expectedColumns.length === 0) {
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
        expectedColumns: input.expectedColumns,
        expectedRows: input.expectedRows,
        ignoreRowOrder: input.ignoreRowOrder,
        ignoreColumnOrder: input.ignoreColumnOrder,
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
      problemTitle: input.problemTitle,
      query: input.query,
      verdict,
      executionTimeMs: result.executionTimeMs,
      passedDatasets: result.passedDatasets,
      totalDatasets: result.totalDatasets,
    });
  } catch (e) {
    console.error("submitSqlAction: failed to store submission:", e);
  }

  return result;
}
