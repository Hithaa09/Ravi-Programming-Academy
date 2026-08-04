import { fork } from "child_process";
import path from "path";
import { validateStudentQuery } from "./validator";
import { logError } from "@/lib/log";
import type { SqlRunInput, SqlRunResult } from "./types";

const WORKER_PATH = path.join(process.cwd(), "lib/sql/sql-worker.cjs");
// Hard wall-clock deadline — comfortably inside the 2-3s range required for
// student queries, matching what a "Time Limit Exceeded"-style ceiling
// should feel like on a learning platform.
const TIMEOUT_MS = 2500;

// ---------------------------------------------------------------------------
// Bounded concurrency — caps how many SQL worker processes can be forked at
// once. Every Run/Submit/hidden-dataset check forks a fresh Node process;
// with no cap, a burst of concurrent SQL activity (e.g. a class submitting
// near a deadline) could spawn an unbounded number of them at once and
// exhaust host memory/process slots. This is a plain in-memory counting
// semaphore with a FIFO wait queue — no Redis, no queue library, nothing
// external, since a single Node process is the only thing forking these
// workers in the first place.
// ---------------------------------------------------------------------------
const MAX_CONCURRENT_SQL_WORKERS = 10;
let activeSqlWorkers = 0;
const sqlWorkerQueue: Array<() => void> = [];

function acquireSqlWorkerSlot(): Promise<void> {
  if (activeSqlWorkers < MAX_CONCURRENT_SQL_WORKERS) {
    activeSqlWorkers++;
    return Promise.resolve();
  }
  // No free slot — wait in line. Array.push + Array.shift is FIFO: whoever
  // asked first gets the next slot that opens up. There's no timeout on this
  // wait and no rejection path, so a queued request can never be dropped —
  // it either eventually gets a slot, or the request itself is torn down
  // upstream (e.g. the client navigating away), same as today.
  return new Promise<void>((resolve) => {
    sqlWorkerQueue.push(resolve);
  });
}

function releaseSqlWorkerSlot(): void {
  const next = sqlWorkerQueue.shift();
  if (next) {
    // Hand the freed slot directly to the next waiter instead of
    // decrementing-then-letting-everyone-race: activeSqlWorkers stays
    // constant (one finished, one starts), so there's no window where the
    // count briefly dips and a request that arrives *after* the queue was
    // already waiting could sneak in ahead of it.
    next();
  } else {
    activeSqlWorkers--;
  }
}

/**
 * Executes a student SQL query with full isolation from the main server
 * process: runs in a dedicated child PROCESS (not a worker_thread) with a
 * hard timeout enforced via SIGKILL, behind a bounded-concurrency queue so
 * at most MAX_CONCURRENT_SQL_WORKERS of these processes ever run at once.
 *
 * This must be a child process, not a worker_thread. worker_threads share
 * the parent's OS process, and Worker.terminate() can only stop a thread at
 * a JS-level "safe point" — it cannot interrupt a synchronous native call
 * already in progress. better-sqlite3 is exactly that: a synchronous native
 * binding. Verified directly: terminate() was called on a worker running a
 * runaway query, its promise resolved, and the underlying query kept
 * consuming a full CPU core indefinitely afterward — terminate() never
 * actually stopped it. A child process has no such gap: SIGKILL is an OS
 * signal that cannot be caught, blocked, or ignored, so kill() unconditionally
 * reclaims 100% of that process's resources immediately, regardless of what
 * native code it's stuck in.
 *
 * Always resolves — never throws — mirroring the shape callers already
 * expect from the old in-process runSql().
 */
export async function runSqlIsolated(input: SqlRunInput): Promise<SqlRunResult> {
  // Validate in the main process first — cheap (plain regex/string
  // scanning), and rejects bad queries instantly without the cost of
  // spawning a child process (or waiting in the worker queue) at all.
  const validation = validateStudentQuery(input.query);
  if (!validation.valid) {
    return { columns: [], rows: [], executionTimeMs: 0, error: validation.error };
  }

  await acquireSqlWorkerSlot();
  try {
    return await executeInWorker(input);
  } finally {
    releaseSqlWorkerSlot();
  }
}

function executeInWorker(input: SqlRunInput): Promise<SqlRunResult> {
  return new Promise((resolve) => {
    let settled = false;
    const child = fork(WORKER_PATH, [], { silent: true });

    // silent: true keeps the child's stdout/stderr from polluting server
    // logs on every query, but if the child crashes for a reason other than
    // our own timeout kill (a genuine native fault, not just a slow query),
    // that diagnostic should still reach the server logs rather than
    // vanishing silently.
    let stderrOutput = "";
    child.stderr?.on("data", (chunk: Buffer) => { stderrOutput += chunk.toString(); });

    function finish(result: SqlRunResult) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
      // SIGKILL, not the default SIGTERM — a runaway query won't be
      // listening for signals to shut down gracefully, and SIGKILL is the
      // one signal a process can never intercept or delay.
      child.kill("SIGKILL");
    }

    const timer = setTimeout(() => {
      finish({
        columns: [],
        rows: [],
        executionTimeMs: TIMEOUT_MS,
        error: `Query timed out after ${TIMEOUT_MS / 1000}s. Check for a missing WHERE/JOIN condition or an expensive operation.`,
      });
    }, TIMEOUT_MS);

    child.once("message", (result: SqlRunResult) => finish(result));
    child.once("error", (err: Error) =>
      finish({ columns: [], rows: [], executionTimeMs: 0, error: `Query execution failed: ${err.message}` })
    );
    child.once("exit", (code, signal) => {
      // Only reached first if the child stopped on its own (crash, OOM,
      // native fault) before we ever decided to kill it — our own kill()
      // calls also trigger 'exit', but by then `settled` is already true and
      // finish() below is a guarded no-op. This branch is specifically the
      // "something actually went wrong" case worth logging.
      if (!settled && stderrOutput) {
        logError("runSqlIsolated: child exited unexpectedly", {
          context: { code, signal, stderr: stderrOutput.trim() },
        });
      }
      finish({ columns: [], rows: [], executionTimeMs: 0, error: "Query execution ended unexpectedly." });
    });

    child.send(input);
  });
}
