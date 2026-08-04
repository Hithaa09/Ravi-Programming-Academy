"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Editor } from "@monaco-editor/react";
import type { TestCase, Difficulty, QuestionStatus, QuestionAvailability, AccessType } from "@/lib/types";
import { CODE_LANGUAGES, type CodeLanguage } from "@/lib/languages";
import { DEFAULT_TIME_LIMIT_MS, DEFAULT_MEMORY_LIMIT_KB, MIN_TIME_LIMIT_MS, MAX_TIME_LIMIT_MS, MIN_MEMORY_LIMIT_KB, MAX_MEMORY_LIMIT_KB } from "@/lib/execution-limits";
import {
  PARAM_TYPES,
  FUNCTION_ONLY_LANGUAGES,
  getWrapperAdapter,
  coerceInputValue,
  formatValueForInput,
  type ParamType,
  type FunctionParam,
  type FunctionSignature,
  type FunctionTestCase,
} from "@/lib/wrappers";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  createProblem,
  updateProblem,
  deleteProblem,
  type ProgrammingProblemRecord,
  type ExecutionStyle,
} from "@/lib/actions/programming-problems";
import { parseProblemFile, type ZipParseResult } from "@/lib/actions/parse-problem-file";
import {
  extractProblemFields,
  type ExtractedProblemFields,
} from "@/lib/actions/extract-problem-fields";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
const QUESTION_STATUSES: QuestionStatus[] = ["Draft", "Published", "Archived"];
const QUESTION_AVAILABILITIES: QuestionAvailability[] = ["Locked", "Available"];
const ACCESS_TYPES: AccessType[] = ["FREE", "PREMIUM"];
const EXECUTION_STYLES: ExecutionStyle[] = ["FULL_PROGRAM", "FUNCTION_ONLY"];
const FUNCTION_ONLY_CODE_LANGUAGES = CODE_LANGUAGES.filter((l) => FUNCTION_ONLY_LANGUAGES.includes(l.id));

type EntryMethod = "manual" | "import";

interface ProgrammingProblemFormProps {
  mode: "create" | "edit";
  backHref: string;
  cancelHref: string;
  initial?: ProgrammingProblemRecord | null;
}

function emptyCase(): TestCase {
  return { input: "", expected: "" };
}

function textareaClass(extra = "") {
  return `w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary ${extra}`;
}

function TestCaseEditor({
  title,
  description,
  locked,
  cases,
  onChange,
  addLabel,
}: {
  title: string;
  description: string;
  locked?: boolean;
  cases: TestCase[];
  onChange: (next: TestCase[]) => void;
  addLabel: string;
}) {
  function update(idx: number, field: "input" | "expected", value: string) {
    onChange(cases.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }
  function remove(idx: number) {
    onChange(cases.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-headline-md text-body-lg font-semibold text-on-surface">{title}</h3>
        {locked && <span className="material-symbols-outlined text-on-surface-variant text-[18px]">lock</span>}
        <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low rounded-full px-2 py-0.5">
          {cases.length}
        </span>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mb-4">{description}</p>
      <div className="space-y-4">
        {cases.length === 0 ? (
          <div className="flex items-center justify-center py-8 border border-dashed border-outline-variant/40 rounded-xl text-on-surface-variant font-body-md text-body-md">
            No test cases yet. Click &ldquo;{addLabel}&rdquo; to add one.
          </div>
        ) : (
          cases.map((c, idx) => (
            <div key={idx} className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md font-bold text-on-surface">Case {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="text-on-surface-variant hover:text-error transition-colors"
                  aria-label={`Remove case ${idx + 1}`}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Input</label>
                  <textarea
                    value={c.input}
                    onChange={(e) => update(idx, "input", e.target.value)}
                    rows={3}
                    className={textareaClass("text-sm")}
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Expected Output</label>
                  <textarea
                    value={c.expected}
                    onChange={(e) => update(idx, "expected", e.target.value)}
                    rows={3}
                    className={textareaClass("text-sm")}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <Button type="button" variant="secondary" className="mt-4" onClick={() => onChange([...cases, emptyCase()])}>
        <span className="material-symbols-outlined text-[18px]">add</span> {addLabel}
      </Button>
    </div>
  );
}

function CodeLanguageEditor({
  title,
  description,
  value,
  onChange,
  placeholder,
  languages = CODE_LANGUAGES,
}: {
  title: string;
  description: string;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  placeholder: (lang: CodeLanguage) => string;
  languages?: CodeLanguage[];
}) {
  const [active, setActive] = useState(languages[0].id);
  const activeLang = languages.find((l) => l.id === active) ?? languages[0];
  const activeValue = value[activeLang.id] ?? "";

  return (
    <div>
      <h3 className="font-headline-md text-body-lg font-semibold text-on-surface mb-1">{title}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant mb-4">{description}</p>

      <div className="relative">
        <div className="flex items-center overflow-x-auto border-b border-outline-variant/20 [scrollbar-width:none]">
          {languages.map((lang) => {
            const filled = Boolean(value[lang.id]?.trim());
            const isActive = lang.id === active;
            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => setActive(lang.id)}
                className={`flex items-center gap-1 px-2 py-2 -mb-px border-b-2 font-label-md text-label-md whitespace-nowrap transition-colors shrink-0 ${
                  isActive ? "border-secondary text-secondary" : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">code</span>
                {lang.label}
                <span
                  className={`inline-flex items-center px-1 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${
                    filled ? "bg-status-solved-bg text-status-solved-text" : "bg-surface-container-low text-on-surface-variant"
                  }`}
                >
                  {filled ? "Completed" : "Empty"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-px w-8 bg-gradient-to-l from-background to-transparent" />
      </div>

      <div className="relative mt-3 rounded-lg border border-outline-variant/30 overflow-hidden">
        <Editor
          height="260px"
          theme="vs-dark"
          language={activeLang.monacoId}
          value={activeValue}
          onChange={(v) => onChange({ ...value, [active]: v ?? "" })}
          options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "Menlo, Consolas, 'Courier New', monospace", scrollBeyondLastLine: false }}
        />
        {!activeValue && (
          <div className="pointer-events-none absolute top-0 left-[64px] pt-[8px] font-mono text-sm text-white/30">
            {placeholder(activeLang)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Function Only mode ──────────────────────────────────────────────────────
// Function Only problems replace the raw-stdin/stdout authoring UI above
// (TestCaseEditor, and Starter Code's CodeLanguageEditor) with a structured
// signature builder, typed test cases, and a read-only generated-stub
// preview. Official Solutions keeps using CodeLanguageEditor as-is (still
// just "one code blob per language"), restricted to the 4 Function-Only
// languages via the `languages` prop added above.

function FunctionSignatureBuilder({
  functionName,
  onFunctionNameChange,
  params,
  onParamsChange,
  onRemoveParam,
  returnType,
  onReturnTypeChange,
}: {
  functionName: string;
  onFunctionNameChange: (v: string) => void;
  params: FunctionParam[];
  onParamsChange: (next: FunctionParam[]) => void;
  // Separate from onParamsChange: removing a param shifts every later
  // param's index, which would silently misalign any test case data already
  // authored against the old positions (test cases store args positionally,
  // with no name tag per value) unless the caller also re-splices its stored
  // test cases at the same index. onParamsChange alone can't signal that.
  onRemoveParam: (idx: number) => void;
  returnType: ParamType;
  onReturnTypeChange: (v: ParamType) => void;
}) {
  function updateParam(idx: number, field: "name" | "type", value: string) {
    onParamsChange(params.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  return (
    <div>
      <h3 className="font-headline-md text-body-lg font-semibold text-on-surface mb-1">Function Signature</h3>
      <p className="font-body-md text-body-md text-on-surface-variant mb-4">
        Defines the function students implement. The backend generates the hidden driver code from this for every supported language.
      </p>
      <div className="mb-4">
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Function Name</label>
        <input
          value={functionName}
          onChange={(e) => onFunctionNameChange(e.target.value)}
          placeholder="e.g. twoSum"
          className={textareaClass()}
        />
      </div>
      <div className="space-y-3 mb-4">
        <label className="font-label-sm text-label-sm text-on-surface-variant block">Parameters</label>
        {params.length === 0 && (
          <div className="flex items-center justify-center py-6 border border-dashed border-outline-variant/40 rounded-xl text-on-surface-variant font-body-md text-body-md">
            No parameters yet.
          </div>
        )}
        {params.map((p, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <input
              value={p.name}
              onChange={(e) => updateParam(idx, "name", e.target.value)}
              placeholder="param name"
              className={textareaClass("flex-1")}
            />
            <select
              value={p.type}
              onChange={(e) => updateParam(idx, "type", e.target.value)}
              className={textareaClass("w-40 shrink-0")}
            >
              {PARAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              type="button"
              onClick={() => onRemoveParam(idx)}
              className="text-on-surface-variant hover:text-error transition-colors shrink-0"
              aria-label={`Remove parameter ${idx + 1}`}
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={() => onParamsChange([...params, { name: "", type: "int" }])}>
          <span className="material-symbols-outlined text-[18px]">add</span> Add Parameter
        </Button>
      </div>
      <div>
        <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Return Type</label>
        <select
          value={returnType}
          onChange={(e) => onReturnTypeChange(e.target.value as ParamType)}
          className={textareaClass("w-40")}
        >
          {PARAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );
}

interface FunctionTestCaseInput {
  argInputs: string[];
  expectedInput: string;
}

function emptyFunctionCase(paramCount: number): FunctionTestCaseInput {
  return { argInputs: new Array(paramCount).fill(""), expectedInput: "" };
}

// Keeps already-authored test cases aligned with the signature after a
// parameter is deleted — test cases store args positionally (no per-value
// name tag), so removing param index N must also drop argInputs[N] from
// every existing case, or every value after it would silently shift left
// and end up labeled against the wrong parameter.
function removeParamIndexFromCases(cases: FunctionTestCaseInput[], removedIdx: number): FunctionTestCaseInput[] {
  return cases.map((c) => ({ ...c, argInputs: c.argInputs.filter((_, i) => i !== removedIdx) }));
}

// Converts a stored FunctionTestCase (real JSON args/expected) back into the
// raw-text form this editor works with, for loading an existing problem.
function toFunctionTestCaseInput(tc: FunctionTestCase, params: FunctionParam[], returnType: ParamType): FunctionTestCaseInput {
  return {
    argInputs: params.map((p, i) => formatValueForInput(tc.args[i], p.type)),
    expectedInput: formatValueForInput(tc.expected, returnType),
  };
}

// Coerces every case's raw text into real JSON values via coerceInputValue,
// stopping at (and reporting) the first coercion error rather than silently
// saving a garbage value.
function buildFunctionTestCases(
  cases: FunctionTestCaseInput[],
  params: FunctionParam[],
  returnType: ParamType
): { result: FunctionTestCase[] | null; error?: string } {
  const result: FunctionTestCase[] = [];
  for (let c = 0; c < cases.length; c++) {
    const args: unknown[] = [];
    for (let i = 0; i < params.length; i++) {
      const { value, error } = coerceInputValue(cases[c].argInputs[i] ?? "", params[i].type);
      if (error) return { result: null, error: `Case ${c + 1}, parameter "${params[i].name || i + 1}": ${error}` };
      args.push(value);
    }
    const { value: expected, error: expectedError } = coerceInputValue(cases[c].expectedInput, returnType);
    if (expectedError) return { result: null, error: `Case ${c + 1}, expected output: ${expectedError}` };
    result.push({ args, expected });
  }
  return { result };
}

function FunctionTestCaseEditor({
  title,
  description,
  locked,
  params,
  returnType,
  cases,
  onChange,
  addLabel,
}: {
  title: string;
  description: string;
  locked?: boolean;
  params: FunctionParam[];
  returnType: ParamType;
  cases: FunctionTestCaseInput[];
  onChange: (next: FunctionTestCaseInput[]) => void;
  addLabel: string;
}) {
  function updateArg(caseIdx: number, paramIdx: number, value: string) {
    onChange(
      cases.map((c, i) => {
        if (i !== caseIdx) return c;
        const argInputs = [...c.argInputs];
        while (argInputs.length <= paramIdx) argInputs.push("");
        argInputs[paramIdx] = value;
        return { ...c, argInputs };
      })
    );
  }
  function updateExpected(caseIdx: number, value: string) {
    onChange(cases.map((c, i) => (i === caseIdx ? { ...c, expectedInput: value } : c)));
  }
  function remove(caseIdx: number) {
    onChange(cases.filter((_, i) => i !== caseIdx));
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-headline-md text-body-lg font-semibold text-on-surface">{title}</h3>
        {locked && <span className="material-symbols-outlined text-on-surface-variant text-[18px]">lock</span>}
        <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low rounded-full px-2 py-0.5">
          {cases.length}
        </span>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mb-4">{description}</p>
      {params.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Define at least one parameter in the Function Signature above before adding test cases.
        </p>
      ) : (
        <div className="space-y-4">
          {cases.length === 0 ? (
            <div className="flex items-center justify-center py-8 border border-dashed border-outline-variant/40 rounded-xl text-on-surface-variant font-body-md text-body-md">
              No test cases yet. Click &ldquo;{addLabel}&rdquo; to add one.
            </div>
          ) : (
            cases.map((c, caseIdx) => (
              <div key={caseIdx} className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-label-md text-label-md font-bold text-on-surface">Case {caseIdx + 1}</span>
                  <button
                    type="button"
                    onClick={() => remove(caseIdx)}
                    className="text-on-surface-variant hover:text-error transition-colors"
                    aria-label={`Remove case ${caseIdx + 1}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {params.map((p, paramIdx) => (
                    <div key={paramIdx}>
                      <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                        {p.name || `param${paramIdx + 1}`} <span className="text-on-surface-variant/60">({p.type})</span>
                      </label>
                      <input
                        value={c.argInputs[paramIdx] ?? ""}
                        onChange={(e) => updateArg(caseIdx, paramIdx, e.target.value)}
                        placeholder={p.type.endsWith("[]") ? "comma-separated, e.g. 1, 2, 3" : p.type}
                        className={textareaClass("text-sm")}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                      Expected Output <span className="text-on-surface-variant/60">({returnType})</span>
                    </label>
                    <input
                      value={c.expectedInput}
                      onChange={(e) => updateExpected(caseIdx, e.target.value)}
                      placeholder={returnType.endsWith("[]") ? "comma-separated, e.g. 1, 2, 3" : returnType}
                      className={textareaClass("text-sm")}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
          <Button type="button" variant="secondary" onClick={() => onChange([...cases, emptyFunctionCase(params.length)])}>
            <span className="material-symbols-outlined text-[18px]">add</span> {addLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

function FunctionStubPreview({ signature }: { signature: FunctionSignature }) {
  const [active, setActive] = useState(FUNCTION_ONLY_CODE_LANGUAGES[0].id);
  const activeLang = FUNCTION_ONLY_CODE_LANGUAGES.find((l) => l.id === active) ?? FUNCTION_ONLY_CODE_LANGUAGES[0];
  const adapter = getWrapperAdapter(active);
  const ready = Boolean(signature.functionName.trim()) && signature.params.every((p) => p.name.trim());
  const stub = adapter && ready
    ? adapter.renderFunctionStub(signature)
    : "// Fill in the function name and every parameter name above to preview the generated starter code.";

  return (
    <div>
      <h3 className="font-headline-md text-body-lg font-semibold text-on-surface mb-1">Starter Code Preview</h3>
      <p className="font-body-md text-body-md text-on-surface-variant mb-4">
        Auto-generated from the function signature above, per language — this is exactly what students see. Not editable here.
      </p>
      <div className="flex items-center overflow-x-auto border-b border-outline-variant/20 [scrollbar-width:none]">
        {FUNCTION_ONLY_CODE_LANGUAGES.map((lang) => {
          const isActive = lang.id === active;
          return (
            <button
              key={lang.id}
              type="button"
              onClick={() => setActive(lang.id)}
              className={`flex items-center gap-1 px-3 py-2 -mb-px border-b-2 font-label-md text-label-md whitespace-nowrap transition-colors shrink-0 ${
                isActive ? "border-secondary text-secondary" : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 rounded-lg border border-outline-variant/30 overflow-hidden">
        <Editor
          height="220px"
          theme="vs-dark"
          language={activeLang.monacoId}
          value={stub}
          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, fontFamily: "Menlo, Consolas, 'Courier New', monospace", scrollBeyondLastLine: false }}
        />
      </div>
    </div>
  );
}

// Debug-only view of the exact source Judge0 receives — the student's (or,
// here, the Official Solution's) function body spliced into the generated
// driver. Never shown to students; exists purely so an admin can see why a
// problem's grading is misbehaving without needing to reproduce it in a
// script. Falls back to the plain stub (no student code yet) if no official
// solution has been written for the active language.
function DriverPreview({ signature, officialSolutions }: { signature: FunctionSignature; officialSolutions: Record<string, string> }) {
  const [active, setActive] = useState(FUNCTION_ONLY_CODE_LANGUAGES[0].id);
  const activeLang = FUNCTION_ONLY_CODE_LANGUAGES.find((l) => l.id === active) ?? FUNCTION_ONLY_CODE_LANGUAGES[0];
  const adapter = getWrapperAdapter(active);
  const ready = Boolean(signature.functionName.trim()) && signature.params.every((p) => p.name.trim());
  const driver = adapter && ready
    ? adapter.renderDriver(signature, officialSolutions[active]?.trim() || adapter.renderFunctionStub(signature))
    : "// Fill in the function name and every parameter name above to preview the generated driver.";

  return (
    <div>
      <h3 className="font-headline-md text-body-lg font-semibold text-on-surface mb-1">Generated Driver Preview (Debug)</h3>
      <p className="font-body-md text-body-md text-on-surface-variant mb-4">
        The exact source sent to Judge0 — the function body above spliced into the auto-generated driver. Uses the Official
        Solution below for the active language if one is filled in, otherwise the plain stub. For debugging only — never shown to students.
      </p>
      <div className="flex items-center overflow-x-auto border-b border-outline-variant/20 [scrollbar-width:none]">
        {FUNCTION_ONLY_CODE_LANGUAGES.map((lang) => {
          const isActive = lang.id === active;
          return (
            <button
              key={lang.id}
              type="button"
              onClick={() => setActive(lang.id)}
              className={`flex items-center gap-1 px-3 py-2 -mb-px border-b-2 font-label-md text-label-md whitespace-nowrap transition-colors shrink-0 ${
                isActive ? "border-secondary text-secondary" : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 rounded-lg border border-outline-variant/30 overflow-hidden">
        <Editor
          height="320px"
          theme="vs-dark"
          language={activeLang.monacoId}
          value={driver}
          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, fontFamily: "Menlo, Consolas, 'Courier New', monospace", scrollBeyondLastLine: false }}
        />
      </div>
    </div>
  );
}

function ConfBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 font-label-xs text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
      <span className="material-symbols-outlined text-[10px]">warning</span>
      Low confidence
    </span>
  );
}

interface BulkEntry {
  filename: string;
  parseError?: string;
  title: string;
  difficulty: Difficulty;
  status: QuestionStatus;
  availability: QuestionAvailability;
  accessType: AccessType;
  topic: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  explanation: string;
  visibleCases: TestCase[];
  hiddenCases: TestCase[];
  starterCodeByLang: Record<string, string>;
  officialSolutions: Record<string, string>;
  // Populated only when the source document contained a recognizable
  // Function Signature section (see extractProblemFields) — otherwise
  // executionStyle stays FULL_PROGRAM and these are left at their defaults.
  executionStyle: ExecutionStyle;
  functionName: string;
  functionParams: FunctionParam[];
  functionReturnType: ParamType;
  functionVisibleCases: FunctionTestCaseInput[];
  functionHiddenCases: FunctionTestCaseInput[];
  lowConfidenceCount: number;
}

interface ImportSummary {
  imported: number;
  skipped: string[];
  failed: Array<{ filename: string; reason: string }>;
}

function makeErrorEntry(filename: string, parseError: string): BulkEntry {
  return {
    filename,
    parseError,
    title: "",
    difficulty: "Easy",
    status: "Draft",
    availability: "Locked",
    accessType: "FREE",
    topic: "",
    statement: "",
    inputFormat: "",
    outputFormat: "",
    constraints: "",
    sampleInput: "",
    sampleOutput: "",
    explanation: "",
    visibleCases: [emptyCase()],
    hiddenCases: [emptyCase()],
    starterCodeByLang: {},
    officialSolutions: {},
    executionStyle: "FULL_PROGRAM",
    functionName: "",
    functionParams: [],
    functionReturnType: "int",
    functionVisibleCases: [],
    functionHiddenCases: [],
    lowConfidenceCount: 0,
  };
}

function BulkEntryEditModal({
  entry,
  onSave,
  onClose,
}: {
  entry: BulkEntry;
  onSave: (updated: BulkEntry) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(entry.title);
  const [difficulty, setDifficulty] = useState<Difficulty>(entry.difficulty);
  const [topic, setTopic] = useState(entry.topic);
  const [statement, setStatement] = useState(entry.statement);
  const [inputFormat, setInputFormat] = useState(entry.inputFormat);
  const [outputFormat, setOutputFormat] = useState(entry.outputFormat);
  const [constraints, setConstraints] = useState(entry.constraints);
  const [sampleInput, setSampleInput] = useState(entry.sampleInput);
  const [sampleOutput, setSampleOutput] = useState(entry.sampleOutput);
  const [explanation, setExplanation] = useState(entry.explanation);
  const [visibleCases, setVisibleCases] = useState<TestCase[]>(entry.visibleCases);
  const [hiddenCases, setHiddenCases] = useState<TestCase[]>(entry.hiddenCases);
  const [executionStyle, setExecutionStyle] = useState<ExecutionStyle>(entry.executionStyle);
  const [functionName, setFunctionName] = useState(entry.functionName);
  const [functionParams, setFunctionParams] = useState<FunctionParam[]>(entry.functionParams);
  const [functionReturnType, setFunctionReturnType] = useState<ParamType>(entry.functionReturnType);
  const [functionVisibleCases, setFunctionVisibleCases] = useState<FunctionTestCaseInput[]>(entry.functionVisibleCases);
  const [functionHiddenCases, setFunctionHiddenCases] = useState<FunctionTestCaseInput[]>(entry.functionHiddenCases);

  return (
    <Modal title={`Edit: ${entry.filename.split("/").pop()}`} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={textareaClass()} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className={textareaClass()}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">Topic</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Array, Hash Table" className={textareaClass()} />
          </div>
        </div>
        <div>
          <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">Execution Style</label>
          <select value={executionStyle} onChange={(e) => setExecutionStyle(e.target.value as ExecutionStyle)} className={textareaClass()}>
            {EXECUTION_STYLES.map((s) => (
              <option key={s} value={s}>{s === "FULL_PROGRAM" ? "Full Program" : "Function Only"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">Problem Statement</label>
          <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={6} className={textareaClass()} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">Input Format</label>
            <textarea value={inputFormat} onChange={(e) => setInputFormat(e.target.value)} rows={3} className={textareaClass()} />
          </div>
          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">Output Format</label>
            <textarea value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} rows={3} className={textareaClass()} />
          </div>
        </div>
        <div>
          <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">Constraints</label>
          <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={3} className={textareaClass()} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">Sample Input</label>
            <textarea value={sampleInput} onChange={(e) => setSampleInput(e.target.value)} rows={3} className={textareaClass()} />
          </div>
          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">Sample Output</label>
            <textarea value={sampleOutput} onChange={(e) => setSampleOutput(e.target.value)} rows={3} className={textareaClass()} />
          </div>
        </div>
        <div>
          <label className="font-label-md text-label-md font-bold text-on-surface block mb-1">Explanation</label>
          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} className={textareaClass()} />
        </div>
        {executionStyle === "FUNCTION_ONLY" && (
          <div className="pt-2 border-t border-outline-variant/20 space-y-6">
            <FunctionSignatureBuilder
              functionName={functionName}
              onFunctionNameChange={setFunctionName}
              params={functionParams}
              onParamsChange={setFunctionParams}
              onRemoveParam={(idx) => {
                setFunctionParams((prev) => prev.filter((_, i) => i !== idx));
                setFunctionVisibleCases((prev) => removeParamIndexFromCases(prev, idx));
                setFunctionHiddenCases((prev) => removeParamIndexFromCases(prev, idx));
              }}
              returnType={functionReturnType}
              onReturnTypeChange={setFunctionReturnType}
            />
            <FunctionStubPreview signature={{ functionName, params: functionParams, returnType: functionReturnType }} />
          </div>
        )}
        <div className="pt-2 border-t border-outline-variant/20">
          {executionStyle === "FUNCTION_ONLY" ? (
            <FunctionTestCaseEditor
              title="Visible Test Cases"
              description="Shown to students on the problem page."
              params={functionParams}
              returnType={functionReturnType}
              cases={functionVisibleCases}
              onChange={setFunctionVisibleCases}
              addLabel="Add Test Case"
            />
          ) : (
            <TestCaseEditor
              title="Visible Test Cases"
              description="Shown to students on the problem page."
              cases={visibleCases}
              onChange={setVisibleCases}
              addLabel="Add Test Case"
            />
          )}
        </div>
        <div className="pt-2 border-t border-outline-variant/20">
          {executionStyle === "FUNCTION_ONLY" ? (
            <FunctionTestCaseEditor
              title="Hidden Test Cases"
              description="Used only during grading — never shown to students."
              locked
              params={functionParams}
              returnType={functionReturnType}
              cases={functionHiddenCases}
              onChange={setFunctionHiddenCases}
              addLabel="Add Hidden Test Case"
            />
          ) : (
            <TestCaseEditor
              title="Hidden Test Cases"
              description="Used only during grading — never shown to students."
              locked
              cases={hiddenCases}
              onChange={setHiddenCases}
              addLabel="Add Hidden Test Case"
            />
          )}
        </div>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          {executionStyle === "FUNCTION_ONLY"
            ? "Official solutions can be added after import via the Edit Problem page."
            : "Starter code and solutions can be added after import via the Edit Problem page."}
        </p>
        <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant/20">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            onClick={() =>
              onSave({
                ...entry,
                title, difficulty, topic, statement, inputFormat, outputFormat, constraints, sampleInput, sampleOutput, explanation,
                visibleCases, hiddenCases,
                executionStyle, functionName, functionParams, functionReturnType, functionVisibleCases, functionHiddenCases,
              })
            }
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ProgrammingProblemForm({ mode, backHref, cancelHref, initial }: ProgrammingProblemFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  const [entryMethod, setEntryMethod] = useState<EntryMethod>("manual");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "Easy");
  const [status, setStatus] = useState<QuestionStatus>(initial?.status ?? "Draft");
  const [availability, setAvailability] = useState<QuestionAvailability>(initial?.availability ?? "Locked");
  const [accessType, setAccessType] = useState<AccessType>(initial?.accessType ?? "FREE");
  const [executionStyle, setExecutionStyle] = useState<ExecutionStyle>(initial?.executionStyle ?? "FULL_PROGRAM");
  const [functionName, setFunctionName] = useState(initial?.functionSignature?.functionName ?? "");
  const [functionParams, setFunctionParams] = useState<FunctionParam[]>(initial?.functionSignature?.params ?? []);
  const [functionReturnType, setFunctionReturnType] = useState<ParamType>(initial?.functionSignature?.returnType ?? "int");
  const [functionVisibleCases, setFunctionVisibleCases] = useState<FunctionTestCaseInput[]>(
    (initial?.functionTestCases ?? []).map((tc) =>
      toFunctionTestCaseInput(tc, initial?.functionSignature?.params ?? [], initial?.functionSignature?.returnType ?? "int")
    )
  );
  const [functionHiddenCases, setFunctionHiddenCases] = useState<FunctionTestCaseInput[]>(
    (initial?.functionHiddenTestCases ?? []).map((tc) =>
      toFunctionTestCaseInput(tc, initial?.functionSignature?.params ?? [], initial?.functionSignature?.returnType ?? "int")
    )
  );
  const [topic, setTopic] = useState(initial?.topics?.join(", ") ?? "");
  const [statement, setStatement] = useState(initial?.description ?? "");
  const [inputFormat, setInputFormat] = useState(initial?.inputFormat ?? "");
  const [outputFormat, setOutputFormat] = useState(initial?.outputFormat ?? "");
  const [constraints, setConstraints] = useState(initial?.constraints?.join("\n") ?? "");
  const [sampleInput, setSampleInput] = useState(initial?.sampleInput ?? "");
  const [sampleOutput, setSampleOutput] = useState(initial?.sampleOutput ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [timeLimitMs, setTimeLimitMs] = useState(initial?.timeLimitMs?.toString() ?? "");
  const [memoryLimitKb, setMemoryLimitKb] = useState(initial?.memoryLimitKb?.toString() ?? "");

  const [visibleCases, setVisibleCases] = useState<TestCase[]>(
    initial?.testCases?.length ? initial.testCases : [emptyCase()]
  );
  const [hiddenCases, setHiddenCases] = useState<TestCase[]>(
    initial?.hiddenTestCases?.length ? initial.hiddenTestCases : [emptyCase()]
  );
  // Mirrors the server-side check in validateProblemInput (programming-problems.ts):
  // a blank pre-seeded row doesn't count — only test cases with a real expected
  // output do, so this can't be satisfied by leaving the default empty row untouched.
  const hasMeaningfulHiddenCase =
    executionStyle === "FUNCTION_ONLY" ? functionHiddenCases.length > 0 : hiddenCases.some((tc) => tc.expected?.trim());

  const [starterCodeByLang, setStarterCodeByLang] = useState<Record<string, string>>(
    initial?.starterCodeByLanguage ?? {}
  );
  const [officialSolutions, setOfficialSolutions] = useState<Record<string, string>>(
    initial?.officialSolutions ?? {}
  );

  const hadPriorImport = Boolean(initial?.importedFileName);
  const [importedFiles, setImportedFiles] = useState<string[]>(
    initial?.importedFileName ? [initial.importedFileName] : []
  );
  const [dragOver, setDragOver] = useState(false);

  type ParseStatus = "idle" | "parsing" | "done" | "error";
  const [parseStatus, setParseStatus] = useState<ParseStatus>("idle");
  const [parsedFileType, setParsedFileType] = useState<string | null>(null);
  const [parsedCharCount, setParsedCharCount] = useState<number | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);

  type ExtractStatus = "idle" | "extracting" | "done" | "error";
  const [extractStatus, setExtractStatus] = useState<ExtractStatus>("idle");
  const [extracted, setExtracted] = useState<ExtractedProblemFields | null>(null);
  const [lowConfFields, setLowConfFields] = useState<Set<string>>(new Set());

  const [zipMode, setZipMode] = useState(false);
  const [zipEntries, setZipEntries] = useState<BulkEntry[]>([]);
  const [zipSkipped, setZipSkipped] = useState<string[]>([]);
  type ZipExtractStatus = "idle" | "extracting" | "done";
  const [zipExtractStatus, setZipExtractStatus] = useState<ZipExtractStatus>("idle");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkImportErrors, setBulkImportErrors] = useState<Record<number, string>>({});
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; filename?: string } | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  function resetParseState() {
    setParseStatus("idle");
    setParsedFileType(null);
    setParsedCharCount(null);
    setParseError(null);
    setExtractedText(null);
    setExtractStatus("idle");
    setExtracted(null);
    setLowConfFields(new Set());
    setZipMode(false);
    setZipEntries([]);
    setZipSkipped([]);
    setZipExtractStatus("idle");
    setEditingIdx(null);
    setBulkImporting(false);
    setBulkProgress({ done: 0, total: 0 });
    setBulkImportErrors({});
    setScanProgress(null);
    setImportSummary(null);
  }

  async function triggerParse(file: File) {
    setParseStatus("parsing");
    setParsedFileType(null);
    setParsedCharCount(null);
    setParseError(null);
    setExtractedText(null);
    setZipMode(false);
    setZipEntries([]);
    setZipSkipped([]);
    setZipExtractStatus("idle");

    const formData = new FormData();
    formData.append("file", file);
    const result = await parseProblemFile(formData);

    if ("error" in result) {
      setParseStatus("error");
      setParseError(result.error);
      return;
    }

    if ("type" in result) {
      setParseStatus("done");
      setZipMode(true);
      await handleZipExtract(result);
      return;
    }

    setParseStatus("done");
    setParsedFileType(result.fileType);
    setParsedCharCount(result.charCount);
    setExtractedText(result.text);
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);
    setImportedFiles((prev) => [...prev, ...fileArr.map((f) => f.name)]);
    await triggerParse(fileArr[0]);
  }

  function removeFile(idx: number) {
    setImportedFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) resetParseState();
      return next;
    });
  }

  async function handleExtract() {
    if (!extractedText) return;
    setExtractStatus("extracting");
    try {
      const result = await extractProblemFields(extractedText);
      setExtracted(result);

      const low = new Set<string>();
      if (result.title?.confidence === "low") low.add("title");
      if (result.difficulty?.confidence === "low") low.add("difficulty");
      if (result.topic?.confidence === "low") low.add("topic");
      if (result.description?.confidence === "low") low.add("description");
      if (result.inputFormat?.confidence === "low") low.add("inputFormat");
      if (result.outputFormat?.confidence === "low") low.add("outputFormat");
      if (result.constraints?.confidence === "low") low.add("constraints");
      if (result.sampleInput?.confidence === "low") low.add("sampleInput");
      if (result.sampleOutput?.confidence === "low") low.add("sampleOutput");
      if (result.explanation?.confidence === "low") low.add("explanation");
      if (result.visibleTestCases?.confidence === "low") low.add("visibleTestCases");
      if (result.hiddenTestCases?.confidence === "low") low.add("hiddenTestCases");
      if (result.starterCode?.confidence === "low") low.add("starterCode");
      if (result.solutions?.confidence === "low") low.add("solutions");
      if (result.functionSignature?.confidence === "low") low.add("functionSignature");
      setLowConfFields(low);

      if (result.title?.value) setTitle(result.title.value);
      if (result.difficulty?.value) setDifficulty(result.difficulty.value);
      if (result.topic?.value) setTopic(result.topic.value);
      if (result.description?.value) setStatement(result.description.value);
      if (result.inputFormat?.value) setInputFormat(result.inputFormat.value);
      if (result.outputFormat?.value) setOutputFormat(result.outputFormat.value);
      if (result.constraints?.value) setConstraints(result.constraints.value);
      if (result.sampleInput?.value) setSampleInput(result.sampleInput.value);
      if (result.sampleOutput?.value) setSampleOutput(result.sampleOutput.value);
      if (result.explanation?.value) setExplanation(result.explanation.value);
      if (result.visibleTestCases?.value.length) setVisibleCases(result.visibleTestCases.value);
      if (result.hiddenTestCases?.value.length) setHiddenCases(result.hiddenTestCases.value);
      if (result.starterCode?.value && Object.keys(result.starterCode.value).length)
        setStarterCodeByLang(result.starterCode.value);
      if (result.solutions?.value && Object.keys(result.solutions.value).length)
        setOfficialSolutions(result.solutions.value);

      // A recognized "Function Signature" section switches the whole form
      // into Function Only mode — the document's test cases were already
      // parsed as structured args/expected (see extractProblemFields), not
      // raw stdin/stdout, so they get converted to this editor's raw-text
      // representation via the same helper used when loading an existing
      // Function Only problem for editing.
      if (result.functionSignature?.value) {
        const sig = result.functionSignature.value;
        setExecutionStyle("FUNCTION_ONLY");
        setFunctionName(sig.functionName);
        setFunctionParams(sig.params);
        setFunctionReturnType(sig.returnType);
        if (result.functionTestCases?.value.length) {
          setFunctionVisibleCases(result.functionTestCases.value.map((tc) => toFunctionTestCaseInput(tc, sig.params, sig.returnType)));
        }
        if (result.functionHiddenTestCases?.value.length) {
          setFunctionHiddenCases(result.functionHiddenTestCases.value.map((tc) => toFunctionTestCaseInput(tc, sig.params, sig.returnType)));
        }
      }

      setExtractStatus("done");
      setEntryMethod("manual");
    } catch {
      setExtractStatus("error");
    }
  }

  async function buildEntry(filename: string, text: string): Promise<BulkEntry> {
    const fields = await extractProblemFields(text);
    const sig = fields.functionSignature?.value ?? null;
    return {
      filename,
      title: fields.title?.value ?? "",
      difficulty: fields.difficulty?.value ?? "Easy",
      status: "Draft",
      availability: "Locked",
      accessType: "FREE",
      topic: fields.topic?.value ?? "",
      statement: fields.description?.value ?? "",
      inputFormat: fields.inputFormat?.value ?? "",
      outputFormat: fields.outputFormat?.value ?? "",
      constraints: fields.constraints?.value ?? "",
      sampleInput: fields.sampleInput?.value ?? "",
      sampleOutput: fields.sampleOutput?.value ?? "",
      explanation: fields.explanation?.value ?? "",
      visibleCases: fields.visibleTestCases?.value.length ? fields.visibleTestCases.value : [emptyCase()],
      hiddenCases: fields.hiddenTestCases?.value.length ? fields.hiddenTestCases.value : [emptyCase()],
      starterCodeByLang: fields.starterCode?.value ?? {},
      officialSolutions: fields.solutions?.value ?? {},
      executionStyle: sig ? "FUNCTION_ONLY" : "FULL_PROGRAM",
      functionName: sig?.functionName ?? "",
      functionParams: sig?.params ?? [],
      functionReturnType: sig?.returnType ?? "int",
      functionVisibleCases: sig && fields.functionTestCases?.value.length
        ? fields.functionTestCases.value.map((tc) => toFunctionTestCaseInput(tc, sig.params, sig.returnType))
        : [],
      functionHiddenCases: sig && fields.functionHiddenTestCases?.value.length
        ? fields.functionHiddenTestCases.value.map((tc) => toFunctionTestCaseInput(tc, sig.params, sig.returnType))
        : [],
      lowConfidenceCount: fields.lowConfidenceCount,
    };
  }

  async function handleZipExtract(zipResult: ZipParseResult) {
    setZipExtractStatus("extracting");
    setZipSkipped(zipResult.skipped);

    const entries: BulkEntry[] = [];
    const total = zipResult.entries.length;
    setScanProgress({ current: 0, total });

    for (let i = 0; i < zipResult.entries.length; i++) {
      const entry = zipResult.entries[i];
      setScanProgress({ current: i + 1, total, filename: entry.filename });

      if ("error" in entry.result) {
        entries.push(makeErrorEntry(entry.filename, entry.result.error));
        continue;
      }
      try {
        entries.push(await buildEntry(entry.filename, entry.result.text));
      } catch {
        entries.push(makeErrorEntry(entry.filename, "Field extraction failed."));
      }
    }

    setScanProgress(null);
    setZipEntries(entries);
    setZipExtractStatus("done");
  }

  async function handleFolderFiles(files: FileList) {
    const allFiles = Array.from(files);
    if (allFiles.length === 0) return;
    resetParseState();

    const SUPPORTED = ["pdf", "docx", "txt"];
    const supported: File[] = [];
    const skipped: string[] = [];

    for (const file of allFiles) {
      const path = file.webkitRelativePath || file.name;
      const basename = path.split("/").pop() ?? "";
      if (basename.startsWith(".") || path.includes("__MACOSX/")) continue;
      const ext = basename.split(".").pop()?.toLowerCase() ?? "";
      if (SUPPORTED.includes(ext)) {
        supported.push(file);
      } else {
        skipped.push(path);
      }
    }

    const folderName = allFiles[0].webkitRelativePath?.split("/")[0] ?? "Folder";
    setImportedFiles([folderName + "/"]);
    setParseStatus("done");
    setZipMode(true);
    setZipSkipped(skipped);
    setZipExtractStatus("extracting");
    setImportSummary(null);
    setBulkImportErrors({});

    if (supported.length === 0) {
      setZipEntries([]);
      setZipExtractStatus("done");
      return;
    }

    const entries: BulkEntry[] = [];
    setScanProgress({ current: 0, total: supported.length });

    for (let i = 0; i < supported.length; i++) {
      const file = supported[i];
      const filename = file.webkitRelativePath || file.name;
      setScanProgress({ current: i + 1, total: supported.length, filename });

      const formData = new FormData();
      formData.append("file", file);

      let parseResult;
      try {
        parseResult = await parseProblemFile(formData);
      } catch {
        entries.push(makeErrorEntry(filename, "Failed to send file to server."));
        continue;
      }

      if ("error" in parseResult) {
        entries.push(makeErrorEntry(filename, parseResult.error));
        continue;
      }

      if ("type" in parseResult) {
        entries.push(makeErrorEntry(filename, "Unexpected parse result."));
        continue;
      }

      try {
        entries.push(await buildEntry(filename, parseResult.text));
      } catch {
        entries.push(makeErrorEntry(filename, "Field extraction failed."));
      }
    }

    setScanProgress(null);
    setZipEntries(entries);
    setZipExtractStatus("done");
  }

  async function handleBulkImport() {
    const toImport = zipEntries.filter((e) => !e.parseError);
    if (toImport.length === 0) return;

    setBulkImporting(true);
    setBulkImportErrors({});
    setBulkProgress({ done: 0, total: toImport.length });

    const errors: Record<number, string> = {};
    let successCount = 0;

    for (let i = 0; i < zipEntries.length; i++) {
      const entry = zipEntries[i];
      if (entry.parseError) continue;

      const basename = entry.filename.split("/").pop() ?? entry.filename;

      let functionSignaturePayload: FunctionSignature | null = null;
      let functionTestCasesPayload: FunctionTestCase[] = [];
      let functionHiddenTestCasesPayload: FunctionTestCase[] = [];

      if (entry.executionStyle === "FUNCTION_ONLY") {
        const visibleResult = buildFunctionTestCases(entry.functionVisibleCases, entry.functionParams, entry.functionReturnType);
        const hiddenResult = buildFunctionTestCases(entry.functionHiddenCases, entry.functionParams, entry.functionReturnType);
        if (visibleResult.error || hiddenResult.error) {
          errors[i] = `Function Only test case error — ${visibleResult.error ?? hiddenResult.error}`;
          continue;
        }
        functionSignaturePayload = { functionName: entry.functionName, params: entry.functionParams, returnType: entry.functionReturnType };
        functionTestCasesPayload = visibleResult.result!;
        functionHiddenTestCasesPayload = hiddenResult.result!;
      }

      const payload = {
        title: entry.title.trim() || basename.replace(/\.[^.]+$/, ""),
        difficulty: entry.difficulty,
        topics: entry.topic.split(",").map((t) => t.trim()).filter(Boolean),
        description: entry.statement,
        inputFormat: entry.inputFormat,
        outputFormat: entry.outputFormat,
        constraints: entry.constraints.split("\n").map((c) => c.trim()).filter(Boolean),
        sampleInput: entry.sampleInput,
        sampleOutput: entry.sampleOutput,
        explanation: entry.explanation,
        testCases: entry.visibleCases,
        hiddenTestCases: entry.hiddenCases,
        starterCodeByLanguage: entry.starterCodeByLang,
        officialSolutions: entry.officialSolutions,
        importedFileName: entry.filename,
        status: entry.status,
        availability: entry.availability,
        accessType: entry.accessType,
        executionStyle: entry.executionStyle,
        functionSignature: functionSignaturePayload,
        functionTestCases: functionTestCasesPayload,
        functionHiddenTestCases: functionHiddenTestCasesPayload,
      };

      const result = await createProblem(payload);
      if ("error" in result) {
        errors[i] = result.error;
      } else {
        successCount++;
        setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    }

    setBulkImporting(false);
    setBulkImportErrors(errors);

    const failedList: Array<{ filename: string; reason: string }> = [
      ...zipEntries.filter((e) => e.parseError).map((e) => ({ filename: e.filename, reason: e.parseError! })),
      ...Object.entries(errors).map(([idxStr, reason]) => ({ filename: zipEntries[parseInt(idxStr)].filename, reason })),
    ];

    if (failedList.length === 0) {
      toast.success(`${successCount} problem${successCount !== 1 ? "s" : ""} imported successfully.`);
      router.push(cancelHref);
    } else {
      setImportSummary({ imported: successCount, skipped: zipSkipped, failed: failedList });
      if (successCount > 0) {
        toast.success(`${successCount} imported. ${failedList.length} failed — see summary below.`);
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Client-side validation
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "Problem title is required.";
    if (!topic.trim()) errors.topic = "Topic is required.";
    if (!statement.trim()) errors.statement = "Problem statement is required.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    let functionSignaturePayload: FunctionSignature | null = null;
    let functionTestCasesPayload: FunctionTestCase[] = [];
    let functionHiddenTestCasesPayload: FunctionTestCase[] = [];

    if (executionStyle === "FUNCTION_ONLY") {
      if (!functionName.trim()) { setFormError("Function name is required."); return; }
      if (functionParams.length === 0) { setFormError("At least one parameter is required."); return; }
      if (functionParams.some((p) => !p.name.trim())) { setFormError("Every parameter needs a name."); return; }

      const visibleResult = buildFunctionTestCases(functionVisibleCases, functionParams, functionReturnType);
      if (visibleResult.error) { setFormError(`Visible test case error — ${visibleResult.error}`); return; }
      const hiddenResult = buildFunctionTestCases(functionHiddenCases, functionParams, functionReturnType);
      if (hiddenResult.error) { setFormError(`Hidden test case error — ${hiddenResult.error}`); return; }

      functionSignaturePayload = { functionName: functionName.trim(), params: functionParams, returnType: functionReturnType };
      functionTestCasesPayload = visibleResult.result!;
      functionHiddenTestCasesPayload = hiddenResult.result!;
    }

    setSubmitting(true);

    const payload = {
      title: title.trim(),
      difficulty,
      topics: topic.split(",").map((t) => t.trim()).filter(Boolean),
      description: statement,
      inputFormat,
      outputFormat,
      constraints: constraints.split("\n").map((c) => c.trim()).filter(Boolean),
      sampleInput,
      sampleOutput,
      explanation,
      testCases: visibleCases,
      hiddenTestCases: hiddenCases,
      starterCodeByLanguage: starterCodeByLang,
      officialSolutions,
      timeLimitMs: timeLimitMs.trim() === "" ? null : Number(timeLimitMs),
      memoryLimitKb: memoryLimitKb.trim() === "" ? null : Number(memoryLimitKb),
      importedFileName: importedFiles.length > 0 ? importedFiles[0] : undefined,
      status,
      availability,
      accessType,
      executionStyle,
      functionSignature: functionSignaturePayload,
      functionTestCases: functionTestCasesPayload,
      functionHiddenTestCases: functionHiddenTestCasesPayload,
    };

    if (mode === "create") {
      const result = await createProblem(payload);
      setSubmitting(false);
      if ("error" in result) { setFormError(result.error); return; }
      toast.success("Problem created successfully.");
      router.push(cancelHref);
    } else {
      const result = await updateProblem(initial!.id, payload);
      setSubmitting(false);
      if (result?.error) { setFormError(result.error); return; }
      toast.success("Changes saved.");
      router.push(cancelHref);
    }
  }

  async function handleDelete() {
    if (!initial) return;
    setFormError(null);
    setDeleting(true);
    const result = await deleteProblem(initial.id);
    setDeleting(false);
    if (result?.error) { setFormError(result.error); return; }
    router.push(cancelHref);
  }

  const showReplaceWording = importedFiles.length > 0 || hadPriorImport;
  const busy = submitting || deleting;

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">
          {mode === "create" ? "Add Programming Problem" : "Edit Programming Problem"}
        </h1>
        <div className="flex items-center gap-3">
          {mode === "edit" && (
            <Button type="button" variant="secondary" className="!text-error hover:!bg-error/5" onClick={() => setShowDeleteModal(true)} disabled={busy}>
              <span className="material-symbols-outlined text-[18px]">delete</span> Delete
            </Button>
          )}
          <Button variant="secondary" onClick={() => router.push(backHref)} disabled={busy}>
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
          </Button>
        </div>
      </div>

      {formError && (
        <div className="mb-6 flex items-center gap-3 bg-error/5 border border-error/20 rounded-lg px-4 py-3 text-error font-body-md text-body-md">
          <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
          {formError}
        </div>
      )}

      {extractStatus === "done" && extracted && extracted.lowConfidenceCount > 0 && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <span className="material-symbols-outlined text-amber-600 shrink-0">warning</span>
          <div>
            <p className="font-body-md text-body-md text-on-surface font-medium">
              {extracted.lowConfidenceCount} field{extracted.lowConfidenceCount !== 1 ? "s were" : " was"} extracted with low confidence
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              Fields marked below were inferred — review before saving.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-8 mb-8">
        {(
          [
            { id: "manual" as const, label: "Manual Entry" },
            { id: "import" as const, label: "Import Problem" },
          ]
        ).map((opt) => (
          <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="entry-method"
              checked={entryMethod === opt.id}
              onChange={() => setEntryMethod(opt.id)}
              className="w-4 h-4 accent-primary-container"
            />
            <span className="font-label-md text-label-md font-bold text-on-surface">{opt.label}</span>
          </label>
        ))}
      </div>

      {entryMethod === "manual" && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2 mb-2">
              Problem Title <span className="text-error">*</span>
              {lowConfFields.has("title") && <ConfBadge />}
            </label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (fieldErrors.title) setFieldErrors((p) => ({ ...p, title: "" })); }}
              placeholder="Enter problem title"
              className={textareaClass(fieldErrors.title ? "!border-error focus:!ring-error/30" : "")}
            />
            {fieldErrors.title && (
              <p className="mt-1 font-label-sm text-label-sm text-error">{fieldErrors.title}</p>
            )}
          </div>

          {/* Fixed column count, not one-per-field — CSS Grid wraps extra
              fields (Availability when Published, Execution Style) onto a
              second row on its own; matching the column count to the field
              count only crams everything into one cramped row. */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2 mb-2">
                Difficulty <span className="text-error">*</span>
                {lowConfFields.has("difficulty") && <ConfBadge />}
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className={textareaClass()}
              >
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
                Status <span className="text-error">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QuestionStatus)}
                className={textareaClass()}
              >
                {QUESTION_STATUSES.map((s) => (
                  <option key={s} value={s} disabled={s === "Published" && !hasMeaningfulHiddenCase}>
                    {s === "Published" && !hasMeaningfulHiddenCase ? "Published (add a hidden test case first)" : s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
                Access Type <span className="text-error">*</span>
              </label>
              <select
                value={accessType}
                onChange={(e) => setAccessType(e.target.value as AccessType)}
                className={textareaClass()}
              >
                {ACCESS_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
                Execution Style <span className="text-error">*</span>
              </label>
              <select
                value={executionStyle}
                onChange={(e) => setExecutionStyle(e.target.value as ExecutionStyle)}
                className={textareaClass()}
              >
                {EXECUTION_STYLES.map((s) => (
                  <option key={s} value={s}>{s === "FULL_PROGRAM" ? "Full Program" : "Function Only"}</option>
                ))}
              </select>
            </div>
            {status === "Published" && (
              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
                  Availability <span className="text-error">*</span>
                </label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as QuestionAvailability)}
                  className={textareaClass()}
                >
                  {QUESTION_AVAILABILITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2 mb-2">
                Topic <span className="text-error">*</span>
                {lowConfFields.has("topic") && <ConfBadge />}
              </label>
              <input
                value={topic}
                onChange={(e) => { setTopic(e.target.value); if (fieldErrors.topic) setFieldErrors((p) => ({ ...p, topic: "" })); }}
                placeholder="e.g. Array, Hash Table"
                className={textareaClass(fieldErrors.topic ? "!border-error focus:!ring-error/30" : "")}
              />
              {fieldErrors.topic && (
                <p className="mt-1 font-label-sm text-label-sm text-error">{fieldErrors.topic}</p>
              )}
            </div>
          </div>

          {executionStyle === "FUNCTION_ONLY" && (
            <div className="pt-4 border-t border-outline-variant/20 space-y-6">
              <FunctionSignatureBuilder
                functionName={functionName}
                onFunctionNameChange={setFunctionName}
                params={functionParams}
                onParamsChange={setFunctionParams}
                onRemoveParam={(idx) => {
                  setFunctionParams((prev) => prev.filter((_, i) => i !== idx));
                  setFunctionVisibleCases((prev) => removeParamIndexFromCases(prev, idx));
                  setFunctionHiddenCases((prev) => removeParamIndexFromCases(prev, idx));
                }}
                returnType={functionReturnType}
                onReturnTypeChange={setFunctionReturnType}
              />
              <FunctionStubPreview
                signature={{ functionName, params: functionParams, returnType: functionReturnType }}
              />
            </div>
          )}

          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2 mb-2">
              Problem Statement <span className="text-error">*</span>
              {lowConfFields.has("description") && <ConfBadge />}
            </label>
            <textarea
              value={statement}
              onChange={(e) => { setStatement(e.target.value); if (fieldErrors.statement) setFieldErrors((p) => ({ ...p, statement: "" })); }}
              rows={6}
              placeholder="Describe the problem in detail..."
              className={textareaClass(fieldErrors.statement ? "!border-error focus:!ring-error/30" : "")}
            />
            {fieldErrors.statement && (
              <p className="mt-1 font-label-sm text-label-sm text-error">{fieldErrors.statement}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2 mb-2">
                Input Format{lowConfFields.has("inputFormat") && <ConfBadge />}
              </label>
              <textarea
                value={inputFormat}
                onChange={(e) => setInputFormat(e.target.value)}
                rows={3}
                placeholder="Describe the input format..."
                className={textareaClass()}
              />
            </div>
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2 mb-2">
                Output Format{lowConfFields.has("outputFormat") && <ConfBadge />}
              </label>
              <textarea
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                rows={3}
                placeholder="Describe the output format..."
                className={textareaClass()}
              />
            </div>
          </div>

          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2 mb-2">
              Constraints{lowConfFields.has("constraints") && <ConfBadge />}
            </label>
            <textarea
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              rows={3}
              placeholder={"One constraint per line, e.g.\n1 <= nums.length <= 10^4"}
              className={textareaClass()}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
                Time Limit (ms)
              </label>
              <input
                type="number"
                min={MIN_TIME_LIMIT_MS}
                max={MAX_TIME_LIMIT_MS}
                value={timeLimitMs}
                onChange={(e) => setTimeLimitMs(e.target.value)}
                placeholder={`${DEFAULT_TIME_LIMIT_MS} (default)`}
                className={textareaClass()}
              />
              <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                Leave blank to use the platform default ({DEFAULT_TIME_LIMIT_MS} ms).
              </p>
            </div>
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
                Memory Limit (KB)
              </label>
              <input
                type="number"
                min={MIN_MEMORY_LIMIT_KB}
                max={MAX_MEMORY_LIMIT_KB}
                value={memoryLimitKb}
                onChange={(e) => setMemoryLimitKb(e.target.value)}
                placeholder={`${DEFAULT_MEMORY_LIMIT_KB} (default)`}
                className={textareaClass()}
              />
              <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                Leave blank to use the platform default ({DEFAULT_MEMORY_LIMIT_KB} KB).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2 mb-2">
                Sample Input{lowConfFields.has("sampleInput") && <ConfBadge />}
              </label>
              <textarea
                value={sampleInput}
                onChange={(e) => setSampleInput(e.target.value)}
                rows={3}
                className={textareaClass()}
              />
            </div>
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2 mb-2">
                Sample Output{lowConfFields.has("sampleOutput") && <ConfBadge />}
              </label>
              <textarea
                value={sampleOutput}
                onChange={(e) => setSampleOutput(e.target.value)}
                rows={3}
                className={textareaClass()}
              />
            </div>
          </div>

          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2 mb-2">
              Explanation (optional){lowConfFields.has("explanation") && <ConfBadge />}
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
              className={textareaClass()}
            />
          </div>

          <div className="pt-4 border-t border-outline-variant/20">
            {executionStyle === "FUNCTION_ONLY" ? (
              <FunctionTestCaseEditor
                title="Visible Test Cases"
                description="Shown to students on the problem page."
                params={functionParams}
                returnType={functionReturnType}
                cases={functionVisibleCases}
                onChange={setFunctionVisibleCases}
                addLabel="Add Test Case"
              />
            ) : (
              <TestCaseEditor
                title="Visible Test Cases"
                description="Shown to students on the problem page."
                cases={visibleCases}
                onChange={setVisibleCases}
                addLabel="Add Test Case"
              />
            )}
          </div>

          <div className="pt-4 border-t border-outline-variant/20">
            {executionStyle === "FUNCTION_ONLY" ? (
              <FunctionTestCaseEditor
                title="Hidden Test Cases"
                description="Used only during submission grading — never shown to students."
                locked
                params={functionParams}
                returnType={functionReturnType}
                cases={functionHiddenCases}
                onChange={setFunctionHiddenCases}
                addLabel="Add Hidden Test Case"
              />
            ) : (
              <TestCaseEditor
                title="Hidden Test Cases"
                description="Used only during submission grading — never shown to students."
                locked
                cases={hiddenCases}
                onChange={setHiddenCases}
                addLabel="Add Hidden Test Case"
              />
            )}
            {!hasMeaningfulHiddenCase && (
              <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 font-body-md text-body-md">
                <span className="material-symbols-outlined text-[18px] shrink-0">warning</span>
                <span>
                  This problem can&apos;t be published yet. Without a hidden test case
                  {executionStyle === "FUNCTION_ONLY" ? "" : " (with an expected output filled in)"}, grading would
                  fall back to the visible test cases above — which students can already see — letting them
                  hardcode the answer instead of solving the problem.
                </span>
              </div>
            )}
          </div>

          {executionStyle === "FULL_PROGRAM" && (
            <div className="pt-4 border-t border-outline-variant/20">
              <CodeLanguageEditor
                title="Starter Code"
                description="Boilerplate shown to students when they open the problem, per language."
                value={starterCodeByLang}
                onChange={setStarterCodeByLang}
                placeholder={(lang) => `Enter starter code for ${lang.label}...`}
              />
            </div>
          )}

          <div className="pt-4 border-t border-outline-variant/20">
            <CodeLanguageEditor
              title="Official Solutions"
              description={
                executionStyle === "FUNCTION_ONLY"
                  ? "Reference implementation of just the function body, per language. For admin reference only — never shown to students."
                  : "Complete reference solution per language. For admin reference only — never shown to students."
              }
              value={officialSolutions}
              onChange={setOfficialSolutions}
              placeholder={(lang) =>
                executionStyle === "FUNCTION_ONLY"
                  ? `Enter the official ${lang.label} function body...`
                  : `Enter the official ${lang.label} solution...`
              }
              languages={executionStyle === "FUNCTION_ONLY" ? FUNCTION_ONLY_CODE_LANGUAGES : CODE_LANGUAGES}
            />
          </div>

          {executionStyle === "FUNCTION_ONLY" && (
            <div className="pt-4 border-t border-outline-variant/20">
              <DriverPreview
                signature={{ functionName, params: functionParams, returnType: functionReturnType }}
                officialSolutions={officialSolutions}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.push(cancelHref)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {submitting ? "Saving…" : mode === "create" ? "Save Problem" : "Save Changes"}
            </Button>
          </div>
        </form>
      )}

      {entryMethod === "import" && (
        <div className="space-y-6 max-w-3xl">
          <div className="flex items-start gap-3 bg-secondary/5 border border-secondary/20 rounded-lg p-4">
            <span className="material-symbols-outlined text-secondary">info</span>
            <div className="font-body-md text-body-md text-on-surface space-y-0.5">
              <p>Upload a problem file and the text will be extracted automatically.</p>
              <p>Supported formats: PDF, DOCX, TXT. Upload a ZIP or a folder to import multiple questions at once.</p>
            </div>
          </div>

          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
              Problem File <span className="text-error">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-16 cursor-pointer transition-colors ${dragOver ? "border-secondary bg-secondary/5" : "border-outline-variant/40 hover:bg-surface-container-low/50"}`}
            >
              <span className="material-symbols-outlined text-[40px] text-on-surface-variant">cloud_upload</span>
              <p className="font-headline-md text-headline-md text-on-surface">
                {showReplaceWording ? "Replace File" : "Upload File"}
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant text-center px-6">
                Drag and drop, or click to browse.
              </p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">PDF, DOCX, TXT, or ZIP (Max 50MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.zip"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>
            <p className="mt-2 text-center font-label-sm text-label-sm text-on-surface-variant">
              or{" "}
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="text-secondary hover:underline font-medium"
              >
                upload a folder
              </button>
            </p>
            <input
              ref={folderInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFolderFiles(e.target.files)}
            />
          </div>

          {importedFiles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md font-bold text-on-surface">
                  {importedFiles.length} file{importedFiles.length > 1 ? "s" : ""} selected
                </span>
                <button
                  type="button"
                  onClick={() => { setImportedFiles([]); resetParseState(); }}
                  className="font-label-sm text-label-sm text-error font-medium hover:underline"
                >
                  Remove All
                </button>
              </div>
              <div className="space-y-2">
                {importedFiles.map((name, idx) => (
                  <div key={`${name}-${idx}`} className="flex items-center justify-between gap-3 bg-surface-container-low rounded-lg border border-outline-variant/20 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-on-surface-variant shrink-0">description</span>
                      <span className="font-body-md text-body-md text-on-surface truncate">{name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-on-surface-variant hover:text-error transition-colors shrink-0"
                      aria-label={`Remove ${name}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parseStatus !== "idle" && (
            <div>
              {parseStatus === "parsing" && (
                <div className="flex items-center gap-3 bg-secondary/5 border border-secondary/20 rounded-lg px-4 py-3">
                  <span className="material-symbols-outlined text-secondary text-[20px] animate-spin">progress_activity</span>
                  <span className="font-body-md text-body-md text-on-surface">Parsing file…</span>
                </div>
              )}
              {parseStatus === "done" && !zipMode && (
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <span className="material-symbols-outlined text-emerald-600 shrink-0">check_circle</span>
                  <div>
                    <p className="font-body-md text-body-md text-on-surface font-medium">Text extracted successfully</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                      {parsedFileType} · {parsedCharCount?.toLocaleString()} characters
                    </p>
                  </div>
                </div>
              )}
              {parseStatus === "error" && (
                <div className="flex items-start gap-3 bg-error/5 border border-error/20 rounded-lg px-4 py-3">
                  <span className="material-symbols-outlined text-error shrink-0 text-[20px]">error</span>
                  <p className="font-body-md text-body-md text-on-surface">{parseError}</p>
                </div>
              )}
            </div>
          )}

          {zipMode && zipExtractStatus === "extracting" && (
            <div className="flex items-start gap-3 bg-secondary/5 border border-secondary/20 rounded-lg px-4 py-3">
              <span className="material-symbols-outlined text-secondary text-[20px] animate-spin shrink-0 mt-0.5">progress_activity</span>
              <div className="min-w-0">
                {scanProgress ? (
                  <>
                    <p className="font-body-md text-body-md text-on-surface">
                      Parsing {scanProgress.current} of {scanProgress.total} file{scanProgress.total !== 1 ? "s" : ""}…
                    </p>
                    {scanProgress.filename && (
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 truncate">
                        {scanProgress.filename.split("/").pop()}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-body-md text-body-md text-on-surface">Analyzing files in archive…</p>
                )}
              </div>
            </div>
          )}

          {zipMode && zipExtractStatus === "done" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">Import Summary</h3>
                <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low rounded-full px-3 py-1">
                  {zipEntries.filter((e) => !e.parseError).length} ready
                  {zipEntries.filter((e) => e.parseError).length > 0 && ` · ${zipEntries.filter((e) => e.parseError).length} failed`}
                  {zipSkipped.length > 0 && ` · ${zipSkipped.length} skipped`}
                </span>
              </div>

              <div className="space-y-2">
                {zipEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${entry.parseError ? "bg-error/5 border-error/20" : "bg-surface-container-low border-outline-variant/20"}`}
                  >
                    <span className={`material-symbols-outlined shrink-0 text-[20px] ${entry.parseError ? "text-error" : "text-emerald-600"}`}>
                      {entry.parseError ? "error" : "check_circle"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-body-md text-on-surface truncate">
                        {entry.parseError ? entry.filename.split("/").pop() : (entry.title || entry.filename.split("/").pop())}
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                        {entry.parseError
                          ? entry.parseError
                          : `${entry.filename.split("/").pop()} · ${entry.difficulty}${entry.executionStyle === "FUNCTION_ONLY" ? " · Function Only" : ""}${entry.lowConfidenceCount > 0 ? ` · ${entry.lowConfidenceCount} low-confidence field${entry.lowConfidenceCount !== 1 ? "s" : ""}` : ""}`}
                      </p>
                      {bulkImportErrors[idx] && (
                        <p className="font-label-sm text-label-sm text-error mt-0.5">{bulkImportErrors[idx]}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!entry.parseError && (
                        <button
                          type="button"
                          onClick={() => setEditingIdx(idx)}
                          disabled={bulkImporting}
                          className="text-on-surface-variant hover:text-secondary transition-colors p-1 rounded"
                          aria-label={`Edit ${entry.filename}`}
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setZipEntries((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={bulkImporting}
                        className="text-on-surface-variant hover:text-error transition-colors p-1 rounded"
                        aria-label={`Remove ${entry.filename}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}

                {zipSkipped.map((filename, idx) => (
                  <div
                    key={`skip-${idx}`}
                    className="flex items-center gap-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 opacity-50"
                  >
                    <span className="material-symbols-outlined shrink-0 text-[20px] text-on-surface-variant">remove_circle</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-body-md text-on-surface truncate">{filename.split("/").pop()}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Skipped — unsupported format</p>
                    </div>
                  </div>
                ))}
              </div>

              {importSummary && !bulkImporting && (
                <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low divide-y divide-outline-variant/10">
                  <div className="px-4 py-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">check_circle</span>
                    <span className="font-body-md text-body-md text-on-surface">
                      Imported: <strong>{importSummary.imported}</strong>
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">remove_circle</span>
                    <span className="font-body-md text-body-md text-on-surface">
                      Skipped: <strong>{importSummary.skipped.length}</strong>
                      {importSummary.skipped.length > 0 && (
                        <span className="font-label-sm text-label-sm text-on-surface-variant ml-1">(unsupported format)</span>
                      )}
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-error shrink-0">error</span>
                      <span className="font-body-md text-body-md text-on-surface">
                        Failed: <strong>{importSummary.failed.length}</strong>
                      </span>
                    </div>
                    {importSummary.failed.length > 0 && (
                      <ul className="mt-2 ml-6 space-y-1">
                        {importSummary.failed.map((f, i) => (
                          <li key={i} className="font-label-sm text-label-sm text-on-surface-variant">
                            <span className="font-medium text-on-surface">{f.filename.split("/").pop()}</span>
                            {" — "}{f.reason}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push(cancelHref)}
                  disabled={bulkImporting}
                >
                  {importSummary ? "Close" : "Cancel"}
                </Button>
                {bulkImporting ? (
                  <div className="flex items-center gap-2 font-body-md text-body-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Importing {bulkProgress.done} of {bulkProgress.total}…
                  </div>
                ) : importSummary ? (
                  <Button type="button" onClick={() => router.push(cancelHref)}>
                    <span className="material-symbols-outlined text-[18px]">list</span>
                    Go to Problems List
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleBulkImport}
                    disabled={zipEntries.filter((e) => !e.parseError).length === 0}
                  >
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    Import {zipEntries.filter((e) => !e.parseError).length} Question{zipEntries.filter((e) => !e.parseError).length !== 1 ? "s" : ""}
                  </Button>
                )}
              </div>
            </div>
          )}

          {!zipMode && (
            <>
              {extractStatus === "error" && (
                <div className="flex items-start gap-3 bg-error/5 border border-error/20 rounded-lg px-4 py-3">
                  <span className="material-symbols-outlined text-error shrink-0 text-[20px]">error</span>
                  <p className="font-body-md text-body-md text-on-surface">Field extraction failed. Please try again.</p>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push(cancelHref)}
                  disabled={busy || extractStatus === "extracting"}
                >
                  Cancel
                </Button>
                {extractStatus === "extracting" ? (
                  <div className="flex items-center gap-2 font-body-md text-body-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Extracting fields…
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={handleExtract}
                    disabled={busy || parseStatus !== "done"}
                  >
                    <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                    Extract &amp; Fill Form
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {editingIdx !== null && zipEntries[editingIdx] && (
        <BulkEntryEditModal
          entry={zipEntries[editingIdx]}
          onSave={(updated) => {
            setZipEntries((prev) => prev.map((e, i) => (i === editingIdx ? updated : e)));
            setEditingIdx(null);
          }}
          onClose={() => setEditingIdx(null)}
        />
      )}

      {showDeleteModal && (
        <Modal title="Delete Programming Problem" onClose={() => setShowDeleteModal(false)} maxWidth="max-w-sm">
          <p className="font-body-md text-body-md text-on-surface mb-6">
            Are you sure you want to delete <strong>{initial?.title}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleDelete} disabled={deleting} className="!bg-error hover:!bg-error/90">
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
