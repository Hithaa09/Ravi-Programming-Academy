"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Editor } from "@monaco-editor/react";
import { getOfficialSolutionIfUnlocked, type ProgrammingProblemRecord } from "@/lib/actions/programming-problems";
import type { TestCase } from "@/lib/types";
import { CODE_LANGUAGES as ALL_LANGUAGES, DEFAULT_BOILERPLATE } from "@/lib/languages";
import { FUNCTION_ONLY_LANGUAGES, encodeArgsAsStdin, resultsMatch, coerceInputValue, type FunctionTestCase } from "@/lib/wrappers";
import { outputsMatch } from "@/lib/output-compare";
import { MobileSolveNotice } from "@/components/MobileSolveNotice";
import { runProgrammingCode, type ProgrammingRunResult } from "@/lib/actions/run-code";
import { submitProgrammingCode, type ProgrammingSubmitResult } from "@/lib/actions/submit-code";
import { getMyBestAcceptedSubmission, type BestSubmissionStats } from "@/lib/actions/programming-submissions";
import { resolveExecutionLimits } from "@/lib/execution-limits";

interface ProblemSolveViewProps {
  problem: ProgrammingProblemRecord;
  // Server-generated function stubs per language (Function Only mode only) —
  // computed in app/solve/[id]/page.tsx from the signature, since the client
  // never needs the wrapper-generation module itself.
  functionStub?: Record<string, string>;
  backHref: string;
  backLabel: string;
  banner?: React.ReactNode;
}

function formatArgForDisplay(value: unknown): string {
  return JSON.stringify(value);
}

// Drafts are scoped to problem id + language so switching languages or
// navigating between problems never overwrites an unrelated draft.
function draftKey(problemId: number, language: string): string {
  return `rpa:code-draft:${problemId}:${language}`;
}

function starterFor(problem: ProgrammingProblemRecord, lang: string, functionStub?: Record<string, string>): string {
  if (problem.executionStyle === "FUNCTION_ONLY") return functionStub?.[lang] ?? "";
  return problem.starterCodeByLanguage?.[lang] ?? DEFAULT_BOILERPLATE[lang] ?? "";
}

function loadInitialCode(problem: ProgrammingProblemRecord, languages: typeof ALL_LANGUAGES, functionStub?: Record<string, string>): Record<string, string> {
  const starter: Record<string, string> = {};
  for (const lang of languages) {
    starter[lang.id] = starterFor(problem, lang.id, functionStub);
  }
  if (typeof window === "undefined") return starter;
  try {
    for (const lang of Object.keys(starter)) {
      const saved = window.localStorage.getItem(draftKey(problem.id, lang));
      if (saved !== null) starter[lang] = saved;
    }
  } catch {
    // localStorage unavailable (e.g. private browsing) — fall back to starter code.
  }
  return starter;
}

export function ProblemSolveView({ problem, functionStub, backHref, backLabel, banner }: ProblemSolveViewProps) {
  const isFunctionOnly = problem.executionStyle === "FUNCTION_ONLY";
  const LANGUAGES = useMemo(
    () => (isFunctionOnly ? ALL_LANGUAGES.filter((l) => FUNCTION_ONLY_LANGUAGES.includes(l.id)) : ALL_LANGUAGES),
    [isFunctionOnly]
  );
  const [leftTab, setLeftTab] = useState<"description" | "solutions" | "submissions">("description");
  const [officialSolution, setOfficialSolution] = useState<{ unlocked: boolean; solutions: Record<string, string> } | null>(null);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [bottomTab, setBottomTab] = useState<"testcases" | "output" | "result">("testcases");
  const [language, setLanguage] = useState<string>(isFunctionOnly ? LANGUAGES[0]?.id ?? "python" : "python");
  const [code, setCode] = useState<Record<string, string>>(() => loadInitialCode(problem, LANGUAGES, functionStub));
  // -1 is a sentinel meaning "Custom Input" is selected, rather than one of
  // the problem's own visible cases — visibleCases[-1] is undefined, which
  // caseVerdict() below already treats as "not comparable" for free, so
  // custom runs naturally get no pass/fail badge without any special-casing.
  const [activeCase, setActiveCase] = useState(0);
  const [customStdin, setCustomStdin] = useState("");
  const [customArgInputs, setCustomArgInputs] = useState<string[]>(() => (problem.functionSignature?.params ?? []).map(() => ""));
  const [customArgErrors, setCustomArgErrors] = useState<(string | null)[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  // caseIndex is captured at the moment each run happened, so results stay
  // correctly labeled even if the student switches the selected case
  // afterward. "Run" produces one entry; "Run All" produces one per visible
  // test case, appended as each finishes (see handleRunAll).
  const [runResults, setRunResults] = useState<{ caseIndex: number; result: ProgrammingRunResult }[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<ProgrammingSubmitResult | null>(null);
  const [submittedOn, setSubmittedOn] = useState<string | null>(null);
  // Captured right before this submission, so it reflects prior attempts
  // only — see getMyBestAcceptedSubmission's own comment on why fetch order matters.
  const [previousBest, setPreviousBest] = useState<BestSubmissionStats | null>(null);

  const currentLang = useMemo(() => LANGUAGES.find((l) => l.id === language)!, [language, LANGUAGES]);
  const executionLimits = useMemo(() => resolveExecutionLimits(problem), [problem]);

  function handleReset() {
    setCode((prev) => ({ ...prev, [language]: starterFor(problem, language, functionStub) }));
    try {
      window.localStorage.removeItem(draftKey(problem.id, language));
    } catch {
      // localStorage unavailable — reset still applies to in-memory state.
    }
  }

  // Function Only test cases carry structured args, not raw stdin text — the
  // client encodes them the exact same way the grader does (encodeArgsAsStdin
  // is a shared, pure module) since Run never grades/compares, only displays
  // raw output. Visible cases are already sent to the client, so this isn't a
  // new trust boundary — see run-code.ts.
  function stdinForCase(tc: TestCase | FunctionTestCase): string {
    return isFunctionOnly ? encodeArgsAsStdin((tc as FunctionTestCase).args) : (tc as TestCase).input;
  }

  const visibleCases: (TestCase | FunctionTestCase)[] = isFunctionOnly ? problem.functionTestCases : problem.testCases;

  // Only ever set by the server when grading fell back to visible test
  // cases (see ProgrammingSubmitResult.failedVisibleCase) — never reveals
  // anything about hidden cases, since the server itself never populates
  // this field when grading against them.
  const failedVisibleCaseDetail = useMemo(() => {
    const failed = submitResult?.failedVisibleCase;
    if (!failed) return null;
    const tc = visibleCases[failed.index];
    if (!tc) return null;
    const actualDisplay = isFunctionOnly
      ? (() => {
          try {
            return formatArgForDisplay(JSON.parse(failed.actualOutput));
          } catch {
            return failed.actualOutput;
          }
        })()
      : failed.actualOutput;
    const expectedDisplay = isFunctionOnly ? formatArgForDisplay((tc as FunctionTestCase).expected) : (tc as TestCase).expected;
    return { index: failed.index, actualDisplay, expectedDisplay };
  }, [submitResult, visibleCases, isFunctionOnly]);

  // Run never grades server-side (see ProgrammingRunResult.statusLabel's own
  // comment), but visible cases and their expected output are already
  // client-side data — comparing here is purely a display convenience, not a
  // new trust boundary, and mirrors the exact comparator Submit uses
  // server-side (lib/output-compare.ts / lib/wrappers/wire-format.ts) so the
  // ✅/❌ shown here never disagrees with what Submit would say.
  // Returns null when the run didn't complete cleanly — errors already have
  // their own distinct UI, a pass/fail badge on top would be redundant.
  function caseVerdict(caseIndex: number, runResult: ProgrammingRunResult): boolean | null {
    if (!runResult.ok || runResult.compileOutput || runResult.statusLabel) return null;
    const tc = visibleCases[caseIndex];
    if (!tc) return null;
    if (isFunctionOnly) {
      if (!problem.functionSignature) return null;
      return resultsMatch(problem.functionSignature.returnType, runResult.stdout ?? "", (tc as FunctionTestCase).expected).match;
    }
    return outputsMatch(runResult.stdout ?? "", (tc as TestCase).expected);
  }

  // Validates+encodes the custom-input fields into stdin. For Function Only,
  // reuses the exact same text<->value coercion the admin problem form uses
  // for authoring test cases, so a student typing "1, 2, 3" for an int[]
  // param follows the same convention they've already seen in the problem's
  // sample cases. Returns per-field errors instead of throwing, so the UI can
  // point at exactly which field is wrong.
  function buildCustomStdin(): { stdin: string } | { errors: (string | null)[] } {
    if (!isFunctionOnly) return { stdin: customStdin };
    const params = problem.functionSignature?.params ?? [];
    const errors: (string | null)[] = [];
    const values: unknown[] = [];
    let hasError = false;
    for (let i = 0; i < params.length; i++) {
      const { value, error } = coerceInputValue(customArgInputs[i] ?? "", params[i].type);
      errors.push(error ?? null);
      if (error) hasError = true;
      values.push(value);
    }
    if (hasError) return { errors };
    return { stdin: encodeArgsAsStdin(values) };
  }

  async function handleRunCurrent() {
    if (isRunning) return;
    if (activeCase === -1) {
      const built = buildCustomStdin();
      if ("errors" in built) {
        setCustomArgErrors(built.errors);
        return;
      }
      setCustomArgErrors([]);
      setIsRunning(true);
      setRunResults(null);
      setBottomTab("output");
      const result = await runProgrammingCode({ problemId: problem.id, language, code: code[language] ?? "", stdin: built.stdin });
      setRunResults([{ caseIndex: -1, result }]);
      setHasRun(true);
      setIsRunning(false);
      return;
    }
    if (!visibleCases.length) return;
    const caseIndex = activeCase;
    const tc = visibleCases[caseIndex];
    setIsRunning(true);
    setRunResults(null);
    setBottomTab("output");
    const result = await runProgrammingCode({ problemId: problem.id, language, code: code[language] ?? "", stdin: stdinForCase(tc) });
    setRunResults([{ caseIndex, result }]);
    setHasRun(true);
    setIsRunning(false);
  }

  // Runs visible cases one at a time (not concurrently) so a single student's
  // "Run All" click never spikes several simultaneous submissions at once —
  // this matters once Judge0 is self-hosted with a small worker pool shared
  // across a whole class. Results are appended as each case finishes rather
  // than revealed all at once, so the sequential wait doesn't feel idle.
  async function handleRunAll() {
    if (!visibleCases.length || isRunning) return;
    setIsRunning(true);
    setRunResults(null);
    setBottomTab("output");
    const results: { caseIndex: number; result: ProgrammingRunResult }[] = [];
    for (let caseIndex = 0; caseIndex < visibleCases.length; caseIndex++) {
      const tc = visibleCases[caseIndex];
      const result = await runProgrammingCode({ problemId: problem.id, language, code: code[language] ?? "", stdin: stdinForCase(tc) });
      results.push({ caseIndex, result });
      setRunResults([...results]);
    }
    setHasRun(true);
    setIsRunning(false);
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setBottomTab("result");
    // Fetched before submitting, not after — so it reflects only prior
    // attempts and never the one about to be created.
    const bestBefore = await getMyBestAcceptedSubmission(problem.id);
    const res = await submitProgrammingCode({
      problemId: problem.id,
      language,
      code: code[language] ?? "",
    });
    setSubmitResult(res);
    setPreviousBest(bestBefore);
    setSubmittedOn(new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }));
    setIsSubmitting(false);
  }

  // Lazily fetches the official solution when the Solutions tab is opened —
  // the server re-checks "has this student ever gotten Accepted" against the
  // database itself (see getOfficialSolutionIfUnlocked), so this can't be
  // fooled by client state. Re-runs when submitResult's verdict changes too,
  // so getting Accepted while already sitting on this tab (or having visited
  // it earlier in the session while still locked) picks up the unlock
  // without needing to leave and reopen the tab.
  useEffect(() => {
    if (leftTab !== "solutions" || officialSolution?.unlocked) return;
    setSolutionLoading(true);
    getOfficialSolutionIfUnlocked(problem.id).then((res) => {
      setOfficialSolution(res);
      setSolutionLoading(false);
    });
  }, [leftTab, problem.id, submitResult?.verdict, officialSolution?.unlocked]);

  return (
    <div className="bg-background text-on-surface font-body-md antialiased">
      <MobileSolveNotice backHref={backHref} backLabel={backLabel} />
      <div className="hidden md:flex md:flex-col h-screen overflow-hidden">
      {banner}
      <header className="h-14 flex items-center px-4 bg-surface-container-lowest border-b border-surface-container-high shrink-0 z-10">
        <Link href={backHref} className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors font-label-md font-medium">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {backLabel}
        </Link>
      </header>
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <section className="w-full md:w-1/2 md:max-w-[500px] md:min-w-[320px] flex-1 md:flex-none min-h-0 md:h-full bg-surface-container-lowest border-r border-surface-container-high flex flex-col">
          <div className="flex px-2 border-b border-surface-container-high shrink-0">
            {(["description", "solutions", "submissions"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setLeftTab(t)}
                className={`px-4 py-3 font-label-md text-label-md capitalize border-b-2 transition-colors ${leftTab === t ? "text-secondary border-secondary" : "text-on-surface-variant hover:text-on-surface border-transparent"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {leftTab === "description" && (
              <>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="font-headline-lg text-headline-lg text-on-surface">{problem.id}. {problem.title}</h1>
                    <span className="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded text-[11px] font-label-sm uppercase tracking-wider font-bold">
                      {problem.difficulty}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-on-surface-variant font-label-md text-label-md text-xs">
                    {problem.topics.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">sell</span>
                        <span>{problem.topics.join(", ")}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">timer</span>
                      <span>Time Limit: {executionLimits.cpuTimeLimitSeconds}s</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">memory</span>
                      <span>Memory Limit: {Math.round(executionLimits.memoryLimitKb / 1024)} MB</span>
                    </div>
                  </div>
                </div>
                {problem.description && (
                  <p className="font-body-md text-body-md leading-relaxed text-on-surface">{problem.description}</p>
                )}
                {(problem.inputFormat || problem.outputFormat) && (
                  <div className="space-y-4">
                    {problem.inputFormat && (
                      <div>
                        <p className="font-headline-md text-[14px] mb-2 text-on-surface">Input Format:</p>
                        <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant whitespace-pre-wrap">{problem.inputFormat}</p>
                      </div>
                    )}
                    {problem.outputFormat && (
                      <div>
                        <p className="font-headline-md text-[14px] mb-2 text-on-surface">Output Format:</p>
                        <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant whitespace-pre-wrap">{problem.outputFormat}</p>
                      </div>
                    )}
                  </div>
                )}
                {problem.sampleInput && (
                  <div className="space-y-4">
                    <div>
                      <p className="font-headline-md text-[14px] mb-2 text-on-surface">Example 1:</p>
                      <div className="bg-surface-container-low border border-surface-container-high rounded-md p-3 font-label-md text-label-md text-on-surface">
                        <p><strong>Input:</strong> {problem.sampleInput}</p>
                        <p><strong>Output:</strong> {problem.sampleOutput}</p>
                        {problem.explanation && <p><strong>Explanation:</strong> {problem.explanation}</p>}
                      </div>
                    </div>
                  </div>
                )}
                {problem.constraints.length > 0 && (
                  <div>
                    <p className="font-headline-md text-[14px] mb-2 text-on-surface">Constraints:</p>
                    <ul className="list-disc pl-5 space-y-1 font-label-md text-label-md text-on-surface-variant">
                      {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
            {leftTab === "solutions" && (
              solutionLoading ? (
                <p className="font-body-md text-body-md text-on-surface-variant">Loading…</p>
              ) : !officialSolution?.unlocked ? (
                <div className="flex flex-col items-center text-center py-10">
                  <span className="material-symbols-outlined text-[40px] text-on-surface-variant/40 mb-3">lock</span>
                  <p className="font-body-md text-body-md text-on-surface-variant">Solve this problem to unlock the official solution.</p>
                </div>
              ) : officialSolution.solutions[language] ? (
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mb-2">Official solution — {currentLang.label}</p>
                  <pre className="bg-surface-container-low border border-surface-container-high rounded-md p-3 text-on-surface font-mono text-[12px] whitespace-pre-wrap break-words overflow-x-auto">{officialSolution.solutions[language]}</pre>
                </div>
              ) : (
                <p className="font-body-md text-body-md text-on-surface-variant">No official solution available for {currentLang.label}.</p>
              )
            )}
            {leftTab === "submissions" && (
              <p className="font-body-md text-body-md text-on-surface-variant">You haven&apos;t submitted a solution for this problem in this session.</p>
            )}
          </div>
        </section>

        <section className="flex-1 min-h-0 flex flex-col bg-surface-container p-2 gap-2 overflow-y-auto md:overflow-hidden">
          <div className="flex-1 flex flex-col bg-surface-container-lowest border border-surface-container-high rounded-lg shadow-sm overflow-hidden min-h-[300px]">
            <div className="h-12 flex items-center justify-between px-3 border-b border-surface-container-high bg-surface-container-lowest shrink-0">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container-low rounded-md transition-colors border border-surface-container-high font-label-md text-label-md text-on-surface bg-white"
              >
                {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              <div className="flex items-center gap-1.5 lg:gap-2">
                <button onClick={handleReset} className="flex items-center gap-1.5 px-2 lg:px-3 py-1.5 text-on-surface hover:bg-surface-container-low rounded-md transition-colors border border-surface-container-high font-label-md text-label-md">
                  <span className="material-symbols-outlined text-[16px]">refresh</span> <span className="hidden lg:inline">Reset</span>
                </button>
                <button onClick={handleRunCurrent} disabled={isRunning} title="Run the currently selected test case" className="flex items-center gap-1.5 px-2 lg:px-3 py-1.5 text-on-surface hover:bg-surface-container-low rounded-md transition-colors border border-surface-container-high font-label-md text-label-md disabled:opacity-50 disabled:cursor-not-allowed">
                  {isRunning
                    ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined text-[16px]">play_arrow</span>}
                  <span className="hidden lg:inline">{isRunning ? "Running…" : "Run"}</span>
                </button>
                <button onClick={handleRunAll} disabled={isRunning} title="Run every visible test case" className="flex items-center gap-1.5 px-2 lg:px-3 py-1.5 text-on-surface hover:bg-surface-container-low rounded-md transition-colors border border-surface-container-high font-label-md text-label-md disabled:opacity-50 disabled:cursor-not-allowed">
                  {isRunning
                    ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined text-[16px]">checklist</span>}
                  <span className="hidden lg:inline">{isRunning ? "Running…" : "Run All"}</span>
                </button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-1.5 px-2.5 lg:px-4 py-1.5 bg-secondary text-white hover:bg-secondary/90 rounded-md transition-colors shadow-sm font-label-md text-label-md font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting
                    ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined text-[16px]">cloud_upload</span>}
                  <span className="hidden lg:inline">{isSubmitting ? "Evaluating…" : "Submit"}</span>
                </button>
              </div>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                theme="vs-dark"
                language={currentLang.monacoId}
                value={code[language] ?? ""}
                onChange={(v) => {
                  const next = v ?? "";
                  setCode((prev) => ({ ...prev, [language]: next }));
                  try {
                    window.localStorage.setItem(draftKey(problem.id, language), next);
                  } catch {
                    // localStorage unavailable — code still works, just isn't persisted.
                  }
                }}
                options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "Menlo, Consolas, 'Courier New', monospace", scrollBeyondLastLine: false }}
              />
            </div>
          </div>

          <div className="h-[320px] shrink-0 flex flex-col bg-surface-container-lowest border border-surface-container-high rounded-lg shadow-sm overflow-hidden">
            <div className="flex px-4 border-b border-surface-container-high shrink-0 bg-surface-container-lowest">
              {(["testcases", "output", "result"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setBottomTab(t)}
                  className={`px-2 py-3 mr-4 font-label-md text-label-md border-b-2 transition-colors capitalize ${bottomTab === t ? "text-secondary border-secondary" : "text-on-surface-variant hover:text-on-surface border-transparent"}`}
                >
                  {t === "testcases" ? "Test Cases" : t}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {bottomTab === "testcases" && (
                <div>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {visibleCases.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveCase(i)}
                        className={`px-4 py-1.5 rounded-full font-label-md text-label-md transition-colors ${activeCase === i ? "bg-secondary/10 text-secondary" : "hover:bg-surface-container text-on-surface-variant"}`}
                      >
                        Case {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setActiveCase(-1)}
                      className={`flex items-center gap-1 px-4 py-1.5 rounded-full font-label-md text-label-md transition-colors ${activeCase === -1 ? "bg-secondary/10 text-secondary" : "hover:bg-surface-container text-on-surface-variant"}`}
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span> Custom
                    </button>
                  </div>
                  {activeCase === -1 ? (
                    <div className="space-y-4">
                      {isFunctionOnly ? (
                        (problem.functionSignature?.params ?? []).map((p, i) => (
                          <div key={i}>
                            <label className="block text-xs text-on-surface-variant mb-1">{p.name} <span className="text-on-surface-variant/60">({p.type})</span></label>
                            <input
                              type="text"
                              value={customArgInputs[i] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomArgInputs((prev) => { const next = [...prev]; next[i] = val; return next; });
                              }}
                              placeholder={p.type.endsWith("[]") ? "comma-separated, e.g. 1, 2, 3" : "value"}
                              className="w-full bg-surface-container-low border border-surface-container-high rounded-md p-3 text-on-surface font-label-md text-[13px] focus:outline-none focus:ring-1 focus:ring-secondary"
                            />
                            {customArgErrors[i] && <p className="text-error text-xs mt-1">{customArgErrors[i]}</p>}
                          </div>
                        ))
                      ) : (
                        <div>
                          <label className="block text-xs text-on-surface-variant mb-1">Input (stdin)</label>
                          <textarea
                            value={customStdin}
                            onChange={(e) => setCustomStdin(e.target.value)}
                            rows={6}
                            placeholder="Type your own input here"
                            className="w-full bg-surface-container-low border border-surface-container-high rounded-md p-3 text-on-surface font-mono text-[13px] focus:outline-none focus:ring-1 focus:ring-secondary"
                          />
                        </div>
                      )}
                      <p className="text-on-surface-variant text-xs">Run to see your output — custom input has no expected answer to compare against.</p>
                    </div>
                  ) : visibleCases.length === 0 ? (
                    <p className="font-label-md text-[13px] text-on-surface-variant">No visible test cases for this problem. Use Custom to test your code with your own input.</p>
                  ) : isFunctionOnly ? (
                    <div className="space-y-4">
                      {problem.functionSignature?.params.map((p, i) => (
                        <div key={i}>
                          <label className="block text-xs text-on-surface-variant mb-1">{p.name} <span className="text-on-surface-variant/60">({p.type})</span></label>
                          <div className="bg-surface-container-low border border-surface-container-high rounded-md p-3 text-on-surface font-label-md text-[13px]">
                            {formatArgForDisplay((visibleCases[activeCase] as FunctionTestCase | undefined)?.args[i])}
                          </div>
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs text-on-surface-variant mb-1">
                          Expected Output {problem.functionSignature && <span className="text-on-surface-variant/60">({problem.functionSignature.returnType})</span>}
                        </label>
                        <div className="bg-surface-container-low border border-surface-container-high rounded-md p-3 text-on-surface font-label-md text-[13px]">
                          {formatArgForDisplay((visibleCases[activeCase] as FunctionTestCase | undefined)?.expected)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-on-surface-variant mb-1">Input</label>
                        <div className="bg-surface-container-low border border-surface-container-high rounded-md p-3 text-on-surface font-label-md text-[13px]">
                          {(visibleCases[activeCase] as TestCase | undefined)?.input}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-on-surface-variant mb-1">Expected Output</label>
                        <div className="bg-surface-container-low border border-surface-container-high rounded-md p-3 text-on-surface font-label-md text-[13px]">
                          {(visibleCases[activeCase] as TestCase | undefined)?.expected}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {bottomTab === "output" && (
                <div className="font-label-md text-[13px]">
                  {isRunning && (
                    <p className="text-on-surface-variant">Running your code…</p>
                  )}
                  {!hasRun && !isRunning && (
                    <p className="text-on-surface-variant">Click Run to test {activeCase === -1 ? "your custom input" : `Case ${activeCase + 1}`}, or Run All to test every visible case.</p>
                  )}
                  {hasRun && !isRunning && runResults && (
                    <div className="space-y-6">
                      {runResults.map(({ caseIndex, result: runResult }) => {
                        const verdict = caseVerdict(caseIndex, runResult);
                        const tc = visibleCases[caseIndex];
                        const expectedDisplay = tc
                          ? isFunctionOnly
                            ? formatArgForDisplay((tc as FunctionTestCase).expected)
                            : (tc as TestCase).expected
                          : "";
                        return (
                        <div key={caseIndex} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <p className="font-label-sm font-semibold text-on-surface">{caseIndex === -1 ? "Custom Input" : `Case ${caseIndex + 1}`}</p>
                            {verdict !== null && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold ${verdict ? "bg-status-solved-bg text-status-solved-text" : "bg-status-wrong-bg text-status-wrong-text"}`}>
                                {verdict ? "Passed" : "Failed"}
                              </span>
                            )}
                          </div>
                          {!runResult.ok ? (
                            <div className="space-y-1">
                              <p className="text-error font-label-sm font-semibold">Error</p>
                              <pre className="text-error/90 whitespace-pre-wrap break-words font-mono text-[12px] bg-error/5 border border-error/20 rounded-md p-3">{runResult.error}</pre>
                            </div>
                          ) : (
                            <>
                              {runResult.compileOutput && (
                                <div className="space-y-1">
                                  <p className="text-error font-label-sm font-semibold">Compilation Error</p>
                                  <pre className="text-error/90 whitespace-pre-wrap break-words font-mono text-[12px] bg-error/5 border border-error/20 rounded-md p-3">{runResult.compileOutput}</pre>
                                </div>
                              )}
                              {runResult.statusLabel && !runResult.compileOutput && (
                                <p className="text-error font-label-sm font-semibold">{runResult.statusLabel}</p>
                              )}
                              <div className={verdict !== null ? "grid grid-cols-2 gap-4" : ""}>
                                <div>
                                  <label className="block text-xs text-on-surface-variant mb-1">Your Output</label>
                                  <pre className={`border rounded-md p-3 font-mono text-[12px] whitespace-pre-wrap break-words ${verdict === false ? "bg-status-wrong-bg/40 border-status-wrong-text/30 text-on-surface" : "bg-surface-container-low border-surface-container-high text-on-surface"}`}>{runResult.stdout || "(no output)"}</pre>
                                </div>
                                {verdict !== null && (
                                  <div>
                                    <label className="block text-xs text-on-surface-variant mb-1">Expected Output</label>
                                    <pre className="bg-surface-container-low border border-surface-container-high rounded-md p-3 text-on-surface font-mono text-[12px] whitespace-pre-wrap break-words">{expectedDisplay}</pre>
                                  </div>
                                )}
                              </div>
                              {runResult.stderr && (
                                <div className="space-y-1">
                                  <label className="block text-xs text-on-surface-variant mb-1">Errors (stderr)</label>
                                  <pre className="text-error/90 whitespace-pre-wrap break-words font-mono text-[12px] bg-error/5 border border-error/20 rounded-md p-3">{runResult.stderr}</pre>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-4 pt-1">
                                <div>
                                  <p className="text-on-surface-variant text-xs mb-1 font-label-sm">Execution Time</p>
                                  <p className="text-on-surface font-label-md">
                                    {runResult.executionTimeMs !== null ? `${runResult.executionTimeMs} ms` : "—"}
                                    <span className="text-on-surface-variant text-xs"> / {(executionLimits.cpuTimeLimitSeconds * 1000).toFixed(0)} ms limit</span>
                                  </p>
                                </div>
                                <div>
                                  <p className="text-on-surface-variant text-xs mb-1 font-label-sm">Memory</p>
                                  <p className="text-on-surface font-label-md">
                                    {runResult.memoryKb !== null ? `${(runResult.memoryKb / 1024).toFixed(1)} MB` : "—"}
                                    <span className="text-on-surface-variant text-xs"> / {(executionLimits.memoryLimitKb / 1024).toFixed(0)} MB limit</span>
                                  </p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {bottomTab === "result" && (
                <div>
                  {isSubmitting && (
                    <p className="font-label-md text-[13px] text-on-surface-variant">Evaluating your solution…</p>
                  )}
                  {!isSubmitting && submitResult === null && (
                    <p className="font-label-md text-[13px] text-on-surface-variant">Click Submit to see your result.</p>
                  )}
                  {!isSubmitting && submitResult !== null && (
                    submitResult.error ? (
                      <p className="text-error font-label-md text-[13px]">{submitResult.error}</p>
                    ) : (
                      <>
                        <h2 className={`font-headline-lg text-headline-lg mb-1 ${submitResult.verdict === "Accepted" ? "text-[#16a34a]" : "text-error"}`}>
                          {submitResult.verdict}
                        </h2>
                        <p className="font-label-sm text-[12px] text-on-surface-variant mb-6">
                          {submitResult.passedTests} / {submitResult.totalTests} test {submitResult.totalTests === 1 ? "case" : "cases"} passed
                        </p>
                        {failedVisibleCaseDetail && (
                          <div className="mb-6">
                            <label className="block text-xs text-on-surface-variant mb-2">Failed on Case {failedVisibleCaseDetail.index + 1}</label>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-on-surface-variant mb-1">Your Output</label>
                                <pre className="bg-status-wrong-bg/40 border border-status-wrong-text/30 rounded-md p-3 text-on-surface font-mono text-[12px] whitespace-pre-wrap break-words">{failedVisibleCaseDetail.actualDisplay || "(no output)"}</pre>
                              </div>
                              <div>
                                <label className="block text-xs text-on-surface-variant mb-1">Expected Output</label>
                                <pre className="bg-surface-container-low border border-surface-container-high rounded-md p-3 text-on-surface font-mono text-[12px] whitespace-pre-wrap break-words">{failedVisibleCaseDetail.expectedDisplay}</pre>
                              </div>
                            </div>
                          </div>
                        )}
                        {submitResult.compileOutput && (
                          <div className="space-y-1 mb-6">
                            <label className="block text-xs text-on-surface-variant mb-1">Compile Output</label>
                            <pre className="text-error/90 whitespace-pre-wrap break-words font-mono text-[12px] bg-error/5 border border-error/20 rounded-md p-3">{submitResult.compileOutput}</pre>
                          </div>
                        )}
                        {submitResult.stderr && (
                          <div className="space-y-1 mb-6">
                            <label className="block text-xs text-on-surface-variant mb-1">Errors (stderr)</label>
                            <pre className="text-error/90 whitespace-pre-wrap break-words font-mono text-[12px] bg-error/5 border border-error/20 rounded-md p-3">{submitResult.stderr}</pre>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <div>
                            <p className="text-on-surface-variant text-xs mb-1 font-label-sm">Runtime</p>
                            <p className="text-on-surface font-label-md">
                              {submitResult.executionTimeMs} ms
                              <span className="text-on-surface-variant text-xs"> / {(executionLimits.cpuTimeLimitSeconds * 1000).toFixed(0)} ms limit</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-on-surface-variant text-xs mb-1 font-label-sm">Memory</p>
                            <p className="text-on-surface font-label-md">
                              {(submitResult.memoryKb / 1024).toFixed(1)} MB
                              <span className="text-on-surface-variant text-xs"> / {(executionLimits.memoryLimitKb / 1024).toFixed(0)} MB limit</span>
                            </p>
                          </div>
                        </div>
                        {submitResult.verdict === "Accepted" && (
                          <p className="font-label-sm text-[12px] text-on-surface-variant mb-6">
                            {previousBest === null
                              ? "This is your first accepted submission for this problem."
                              : submitResult.executionTimeMs < previousBest.executionTimeMs
                              ? `Faster than your previous best (${previousBest.executionTimeMs} ms → ${submitResult.executionTimeMs} ms).`
                              : submitResult.executionTimeMs > previousBest.executionTimeMs
                              ? `Your previous best: ${previousBest.executionTimeMs} ms (this attempt: ${submitResult.executionTimeMs} ms).`
                              : `Matches your previous best (${submitResult.executionTimeMs} ms).`}
                          </p>
                        )}
                        <div>
                          <h3 className="font-headline-md text-[14px] text-on-surface mb-3 border-b border-surface-container-high pb-2">Submit Info</h3>
                          <div className="space-y-3 font-label-md text-[13px]">
                            <div className="flex justify-between"><span className="text-on-surface-variant">Submitted On</span><span className="text-on-surface">{submittedOn}</span></div>
                            <div className="flex justify-between"><span className="text-on-surface-variant">Language</span><span className="text-on-surface">{currentLang.label}</span></div>
                            <div className="flex justify-between"><span className="text-on-surface-variant">Test Cases Passed</span><span className="text-on-surface">{submitResult.passedTests} / {submitResult.totalTests}</span></div>
                          </div>
                        </div>
                      </>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      </div>
    </div>
  );
}
