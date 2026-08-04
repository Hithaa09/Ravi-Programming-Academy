// Shared, language-agnostic wire format between the server and every
// generated driver: one JSON value per line, in param order. Every language
// adapter parses this same format inside its generated source — this file
// only builds/reads it from the Node side (server actions and, for the
// client-visible "Run" preview, the admin/student UI).

import type { ParamType } from "./types";

export function encodeArgsAsStdin(args: unknown[]): string {
  return args.map((a) => JSON.stringify(a)).join("\n") + "\n";
}

const FLOAT_TYPES: ParamType[] = ["double", "float"];

function approxEqual(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  return diff <= 1e-6 || diff <= 1e-6 * Math.max(Math.abs(a), Math.abs(b));
}

// Structural comparison between a parsed driver return value and the
// admin-authored expected value, tolerant of float/double imprecision but
// exact for everything else (ints, longs, booleans, chars, strings). Arrays
// are compared element-wise using the same rule as their element type.
function valuesMatch(type: ParamType, actual: unknown, expected: unknown): boolean {
  if (type.endsWith("[]")) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
    if (actual.length !== expected.length) return false;
    const elementType = type.slice(0, -2) as ParamType;
    return actual.every((v, i) => valuesMatch(elementType, v, expected[i]));
  }
  if (FLOAT_TYPES.includes(type)) {
    return typeof actual === "number" && typeof expected === "number" && approxEqual(actual, expected);
  }
  return actual === expected;
}

export interface CompareResult {
  match: boolean;
  // Set when the driver's stdout couldn't be parsed as JSON at all (e.g. the
  // student's function returned something unexpected, or printed extra
  // text) — surfaced as a Wrong Answer rather than crashing the grader.
  parseError?: string;
}

// Compares the driver's raw stdout (expected to be exactly one JSON value,
// possibly with surrounding whitespace) against the admin-authored expected
// value for the given return type.
export function resultsMatch(returnType: ParamType, rawStdout: string, expected: unknown): CompareResult {
  let actual: unknown;
  try {
    actual = JSON.parse(rawStdout.trim());
  } catch {
    return { match: false, parseError: "Output was not in the expected format." };
  }
  return { match: valuesMatch(returnType, actual, expected) };
}
