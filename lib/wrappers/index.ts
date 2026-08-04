import type { LanguageWrapperAdapter } from "./adapter";
import { pythonAdapter } from "./languages/python";
import { javascriptAdapter } from "./languages/javascript";
import { javaAdapter } from "./languages/java";
import { cppAdapter } from "./languages/cpp";

export type { LanguageWrapperAdapter } from "./adapter";
export type { ParamType, FunctionSignature, FunctionParam, FunctionTestCase, ScalarType, ArrayType } from "./types";
export { PARAM_TYPES, isArrayType, elementType } from "./types";
export { encodeArgsAsStdin, resultsMatch } from "./wire-format";
export { coerceInputValue, formatValueForInput } from "./value-coerce";
export { isValidIdentifierName } from "./reserved-words";

// Function-Only mode's language scope is intentionally narrower than Full
// Program's 7 languages: C reuses C++'s Monaco mode with no benefit here, VB's
// Judge0 compiler is already flagged elsewhere in this codebase as broken,
// and Perl has no natural array/object literal story worth building a
// serializer for. This map is the single source of truth for that
// restriction — both the admin form and the server actions read it, so the
// UI can never offer a language the backend doesn't support.
const ADAPTERS: Record<string, LanguageWrapperAdapter> = {
  python: pythonAdapter,
  javascript: javascriptAdapter,
  java: javaAdapter,
  cpp: cppAdapter,
};

export const FUNCTION_ONLY_LANGUAGES = Object.keys(ADAPTERS);

export function getWrapperAdapter(languageId: string): LanguageWrapperAdapter | null {
  return ADAPTERS[languageId] ?? null;
}
