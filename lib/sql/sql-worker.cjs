// Executes a single student SQL query in a dedicated child PROCESS (not a
// worker thread — see lib/sql/run-isolated.ts for why). The caller enforces
// a hard wall-clock timeout by sending SIGKILL if this process runs too
// long; the OS guarantees that terminates it immediately no matter what
// native code it's currently blocked in.
//
// This intentionally duplicates the exec logic from the (now-removed)
// lib/sql/runner.ts rather than importing it: this file is executed
// directly by Node via child_process.fork() (no bundler involved), and
// plain Node cannot run TypeScript without adding a new runtime dependency.
// Query VALIDATION is not duplicated here — it happens once in the parent
// process (lib/sql/validator.ts) before a child is even spawned.

const Database = require("better-sqlite3");

function runSql(input) {
  const db = new Database(":memory:");

  try {
    if (input.schemaSql && input.schemaSql.trim()) {
      db.exec(input.schemaSql);
    }
    if (input.sampleDataSql && input.sampleDataSql.trim()) {
      db.exec(input.sampleDataSql);
    }

    const stmt = db.prepare(input.query);
    const start = performance.now();
    const rawRows = stmt.all();
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
    return { columns: [], rows: [], executionTimeMs: 0, error: err instanceof Error ? err.message : String(err) };
  } finally {
    db.close();
  }
}

process.on("message", (input) => {
  const result = runSql(input);
  process.send(result, () => process.exit(0));
});
