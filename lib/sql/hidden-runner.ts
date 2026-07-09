import { runSql } from "./runner";
import { compareSqlResults } from "./comparator";
import type { SqlHiddenDataset } from "@/lib/types";

export interface HiddenRunInput {
  datasets: SqlHiddenDataset[];
  /** Fallback schema used when a dataset omits its own schemaSql. */
  fallbackSchemaSql: string | null;
  query: string;
  ignoreRowOrder: boolean;
  ignoreColumnOrder: boolean;
}

export interface HiddenRunResult {
  correct: boolean;
  passedDatasets: number;
  totalDatasets: number;
  /** Failure reason from the comparator or SQL error message. */
  reason?: string;
  /** Set when failure was caused by a SQL execution error. */
  error?: string;
  /** Cumulative wall time across all datasets executed. */
  executionTimeMs: number;
  /** Row count from the first dataset's execution. */
  rowsReturned: number;
}

export function runHiddenDatasets(input: HiddenRunInput): HiddenRunResult {
  const { datasets, fallbackSchemaSql, query, ignoreRowOrder, ignoreColumnOrder } = input;
  const total = datasets.length;
  let passed = 0;
  let totalTime = 0;
  let rowsReturned = 0;

  for (let i = 0; i < datasets.length; i++) {
    const dataset = datasets[i];

    const run = runSql({
      // Per-dataset schema overrides the problem schema when provided.
      schemaSql: dataset.schemaSql?.trim() ? dataset.schemaSql : fallbackSchemaSql,
      sampleDataSql: dataset.dataSql,
      query,
    });

    totalTime += run.executionTimeMs;
    if (i === 0) rowsReturned = run.rows.length;

    if (run.error) {
      return {
        correct: false,
        passedDatasets: passed,
        totalDatasets: total,
        reason: run.error,
        error: run.error,
        executionTimeMs: totalTime,
        rowsReturned,
      };
    }

    if (dataset.expectedColumns.length > 0) {
      const comparison = compareSqlResults({
        studentColumns: run.columns,
        studentRows: run.rows,
        expectedColumns: dataset.expectedColumns,
        expectedRows: dataset.expectedRows,
        ignoreRowOrder,
        ignoreColumnOrder,
      });

      if (!comparison.correct) {
        return {
          correct: false,
          passedDatasets: passed,
          totalDatasets: total,
          reason: comparison.reason,
          executionTimeMs: totalTime,
          rowsReturned,
        };
      }
    }

    passed++;
  }

  return {
    correct: true,
    passedDatasets: passed,
    totalDatasets: total,
    executionTimeMs: totalTime,
    rowsReturned,
  };
}
