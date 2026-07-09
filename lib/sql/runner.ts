import Database from "better-sqlite3";
import { validateStudentQuery } from "./validator";
import type { SqlRunInput, SqlRunResult } from "./types";

export function runSql(input: SqlRunInput): SqlRunResult {
  const db = new Database(":memory:");

  try {
    // Phase 1: System SQL — schema setup (not validated, instructor-authored).
    if (input.schemaSql?.trim()) {
      db.exec(input.schemaSql);
    }

    // Phase 2: System SQL — sample data (not validated, instructor-authored).
    if (input.sampleDataSql?.trim()) {
      db.exec(input.sampleDataSql);
    }

    // Phase 3: Validate student query.
    const validation = validateStudentQuery(input.query);
    if (!validation.valid) {
      return { columns: [], rows: [], executionTimeMs: 0, error: validation.error };
    }

    // Phase 4: Execute student query.
    // db.prepare() only accepts a single statement — multi-statement injection is
    // rejected by better-sqlite3 before our code even runs.
    const stmt = db.prepare(input.query);
    const start = performance.now();
    const rawRows = stmt.all() as Record<string, unknown>[];
    const executionTimeMs = Math.round(performance.now() - start);

    const columns = stmt.columns().map((c) => c.name);
    const rows = rawRows.map((row) =>
      columns.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return "NULL";
        return String(val);
      })
    );

    return { columns, rows, executionTimeMs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { columns: [], rows: [], executionTimeMs: 0, error: message };
  } finally {
    // In-memory database is destroyed completely on close.
    db.close();
  }
}
