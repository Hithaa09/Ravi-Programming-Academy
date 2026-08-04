import type { FunctionSignature } from "./types";

// One implementation per supported language. Everything downstream
// (run-code.ts, submit-code.ts, the admin stub preview) only ever calls
// through this interface — adding a new language means writing one new
// adapter file, nothing else changes.
export interface LanguageWrapperAdapter {
  languageId: string; // matches lib/languages.ts CodeLanguage.id

  // The student-facing starter code shown in the editor — just the function
  // stub, never the driver.
  renderFunctionStub(sig: FunctionSignature): string;

  // Splices the student's function body into a full, compilable/runnable
  // source file: reads one stdin line per param, calls the student's
  // function, prints the result as a single JSON line.
  renderDriver(sig: FunctionSignature, studentFunctionCode: string): string;
}
