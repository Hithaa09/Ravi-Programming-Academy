// Structured logging — one JSON line per call, plus (for errors) a report
// to Sentry so real production failures surface proactively instead of only
// being found when a student happens to mention one. Whatever already
// captures this process's stdout/stderr in production (the hosting
// platform's log viewer) keeps working exactly as before — just with
// parseable lines now, and errors now also get sent onward.
//
// Deliberately the simple integration, not Sentry's full auto-instrumentation
// (instrumentation.ts, per-runtime config files, automatic unhandled-exception
// capture): that setup is genuinely version-sensitive to get exactly right,
// and this app already funnels essentially every real error through
// logError() already (grep the codebase — it's at every meaningful failure
// point already, by established convention). Hooking in here reports all of
// those without touching ~15+ call sites individually, and without the risk
// of a subtly-wrong instrumentation config silently capturing nothing.
// Known gap: a genuine uncaught exception that never reaches a logError()
// call (no surrounding try/catch anywhere) won't be reported — acceptable
// given how consistently this codebase already wraps risky operations.
import * as Sentry from "@sentry/nextjs";

let sentryInitialized = false;

function ensureSentryInitialized(): void {
  if (sentryInitialized) return;
  sentryInitialized = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // Not configured — logging still works, just isn't forwarded.
  Sentry.init({ dsn, tracesSampleRate: 0 });
}

type LogLevel = "error" | "warn" | "info";

export interface LogOptions {
  /** The authenticated user this event relates to, if known at the call site. */
  userId?: string;
  /** Extra diagnostic fields. Never put secrets, tokens, or full request bodies here. */
  context?: Record<string, unknown>;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  userId?: string;
  context?: Record<string, unknown>;
}

function write(level: LogLevel, message: string, options?: LogOptions): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(options?.userId !== undefined && { userId: options.userId }),
    ...(options?.context !== undefined && { context: options.context }),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  if (level === "error") {
    ensureSentryInitialized();
    // captureMessage, not captureException — call sites pass a message
    // string plus optional context (often { error: e.message }, already a
    // string), not a live Error object with its own stack trace, so this
    // matches what's actually available here.
    Sentry.captureMessage(message, {
      level: "error",
      extra: { userId: options?.userId, context: options?.context },
    });
  }
}

export function logError(message: string, options?: LogOptions): void {
  write("error", message, options);
}

export function logWarn(message: string, options?: LogOptions): void {
  write("warn", message, options);
}

export function logInfo(message: string, options?: LogOptions): void {
  write("info", message, options);
}
