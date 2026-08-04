// Admin-authoring layer: converts the plain text an admin types into a
// FunctionTestCaseEditor field into the actual JSON value stored in
// functionTestCases/functionHiddenTestCases (and back, for editing an
// existing case). This is a separate concern from wire-format.ts (which
// handles the JS-value <-> stdin-text boundary with the generated drivers)
// and from each language adapter's parse/format code (JS-value <-> native
// language value) — three independent layers, each replaceable on its own.

import { type ParamType, type ScalarType, isArrayType, elementType } from "./types";

export interface CoerceResult {
  value: unknown;
  error?: string;
}

function coerceScalar(raw: string, type: ScalarType): CoerceResult {
  const trimmed = raw.trim();
  switch (type) {
    case "int":
    case "long": {
      if (trimmed === "" || !/^-?\d+$/.test(trimmed)) {
        return { value: 0, error: `Expected a whole number, got "${raw}".` };
      }
      return { value: Number(trimmed) };
    }
    case "double":
    case "float": {
      const n = Number(trimmed);
      if (trimmed === "" || Number.isNaN(n)) {
        return { value: 0, error: `Expected a number, got "${raw}".` };
      }
      return { value: n };
    }
    case "boolean": {
      const lower = trimmed.toLowerCase();
      if (lower !== "true" && lower !== "false") {
        return { value: false, error: `Expected true or false, got "${raw}".` };
      }
      return { value: lower === "true" };
    }
    case "char": {
      if (raw.length !== 1) {
        return { value: raw.slice(0, 1), error: raw.length === 0 ? "Expected a single character." : `Expected a single character, got "${raw}".` };
      }
      return { value: raw };
    }
    case "String":
      return { value: raw };
  }
}

// Arrays are authored as a simple comma-separated list (e.g. "1, 2, 3" or
// "apple, banana"). Known v1 limitation: a String[] element containing a
// literal comma can't be expressed this way — acceptable for the initial
// type set, and documented rather than silently mishandled.
export function coerceInputValue(raw: string, type: ParamType): CoerceResult {
  if (isArrayType(type)) {
    const elType = elementType(type);
    const trimmed = raw.trim();
    if (trimmed === "") return { value: [] };
    const parts = trimmed.split(",").map((p) => p.trim());
    const values: unknown[] = [];
    for (const part of parts) {
      const result = coerceScalar(part, elType);
      if (result.error) return { value: [], error: result.error };
      values.push(result.value);
    }
    return { value: values };
  }
  return coerceScalar(raw, type);
}

function formatScalarForInput(value: unknown, type: ScalarType): string {
  if (value === undefined || value === null) return "";
  if (type === "boolean") return value ? "true" : "false";
  return String(value);
}

export function formatValueForInput(value: unknown, type: ParamType): string {
  if (isArrayType(type)) {
    if (!Array.isArray(value)) return "";
    return value.map((v) => formatScalarForInput(v, elementType(type))).join(", ");
  }
  return formatScalarForInput(value, type);
}
