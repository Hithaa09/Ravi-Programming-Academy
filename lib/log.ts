// Lightweight structured logging — one JSON line per call, zero
// dependencies. Deliberately minimal: no request logging, no request IDs,
// no distributed tracing — this only changes WHAT console.error/warn/log
// write (structured JSON instead of free-form text), not where it goes.
// Whatever already captures this process's stdout/stderr in production
// (systemd journal, a Docker log driver, the hosting platform's log viewer)
// keeps working exactly as before — just with parseable lines now.

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
