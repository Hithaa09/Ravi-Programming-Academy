// Single source of truth for per-problem execution limits, used by Run,
// Submit, and the student-facing problem page display so all three agree on
// the same resolved values.

// 2s / 256MB match what this platform's Judge0 calls already implied before
// per-problem limits existed (Judge0's own documented default cpu_time_limit
// is 2s; 256MB was submit-code.ts's hardcoded constant) — old problems with
// no configured limit behave exactly as before.
export const DEFAULT_TIME_LIMIT_MS = 2000;
export const DEFAULT_MEMORY_LIMIT_KB = 256_000;

export const MIN_TIME_LIMIT_MS = 100;
export const MAX_TIME_LIMIT_MS = 20_000;
export const MIN_MEMORY_LIMIT_KB = 16_000;
export const MAX_MEMORY_LIMIT_KB = 512_000;

export interface ProblemExecutionLimits {
  timeLimitMs: number | null;
  memoryLimitKb: number | null;
}

export interface ResolvedExecutionLimits {
  cpuTimeLimitSeconds: number;
  memoryLimitKb: number;
}

export function resolveExecutionLimits(problem: ProblemExecutionLimits): ResolvedExecutionLimits {
  const timeLimitMs = problem.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS;
  const memoryLimitKb = problem.memoryLimitKb ?? DEFAULT_MEMORY_LIMIT_KB;
  return { cpuTimeLimitSeconds: timeLimitMs / 1000, memoryLimitKb };
}
