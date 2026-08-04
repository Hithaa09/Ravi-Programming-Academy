"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Editor } from "@monaco-editor/react";
import type { SqlProblemRecord } from "@/lib/actions/sql-problems";
import { MobileSolveNotice } from "@/components/MobileSolveNotice";
import { runSqlAction } from "@/lib/actions/run-sql";
import { submitSqlAction } from "@/lib/actions/submit-sql";
import {
  getMySubmissionsForProblem,
  type SqlSubmissionRecord,
} from "@/lib/actions/sql-submissions";
import type { SqlRunResult } from "@/lib/sql/types";

function ResultTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto border border-surface-container-high rounded-md">
      <table className="w-full text-left border-collapse">
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-label-sm text-label-sm uppercase tracking-wider whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container-high">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 font-label-md text-label-md text-on-surface whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SqlCodeBlock({ sql, placeholder }: { sql: string | null; placeholder: string }) {
  if (!sql) {
    return <p className="font-label-md text-[13px] text-on-surface-variant italic">{placeholder}</p>;
  }
  return (
    <pre className="bg-[#1e1e1e] text-[#d4d4d4] rounded-md p-4 font-mono text-sm leading-6 overflow-x-auto whitespace-pre">{sql}</pre>
  );
}

interface SqlSolveViewProps {
  problem: SqlProblemRecord;
  backHref: string;
  backLabel: string;
  banner?: React.ReactNode;
}

// One draft per problem — SQL has no per-language dimension the way the
// Programming editor does, so the key is just the problem id.
function draftKey(problemId: number): string {
  return `rpa:sql-draft:${problemId}`;
}

function loadInitialCode(problemId: number): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(draftKey(problemId)) ?? "";
  } catch {
    return "";
  }
}

export function SqlSolveView({ problem, backHref, backLabel, banner }: SqlSolveViewProps) {
  const [leftTab, setLeftTab] = useState<"description" | "solution" | "submissions">("description");
  const [bottomTab, setBottomTab] = useState<"expected" | "output" | "result">("expected");
  const [mySubmissions, setMySubmissions] = useState<SqlSubmissionRecord[] | null>(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [code, setCode] = useState(() => loadInitialCode(problem.id));
  const [ran, setRan] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<SqlRunResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    submittedOn: string;
    executionTimeMs: number;
    rowsReturned: number;
    correct: boolean;
    passedDatasets: number;
    totalDatasets: number;
    reason?: string;
    error?: string;
  } | null>(null);

  const fetchMySubmissions = useCallback(async () => {
    setSubmissionsLoading(true);
    const subs = await getMySubmissionsForProblem(problem.id);
    setMySubmissions(subs);
    setSubmissionsLoading(false);
  }, [problem.id]);

  useEffect(() => {
    if (leftTab === "submissions" && mySubmissions === null) {
      fetchMySubmissions();
    }
  }, [leftTab, mySubmissions, fetchMySubmissions]);

  function handleReset() {
    setCode("");
    try {
      window.localStorage.removeItem(draftKey(problem.id));
    } catch {
      // localStorage unavailable — reset still applies to in-memory state.
    }
  }

  async function handleRun() {
    if (!code.trim() || isRunning) return;
    setIsRunning(true);
    setRunResult(null);
    setBottomTab("output");
    const res = await runSqlAction({
      problemId: problem.id,
      query: code,
    });
    setRunResult(res);
    setRan(true);
    setIsRunning(false);
  }

  async function handleSubmit() {
    if (!code.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setBottomTab("result");
    const res = await submitSqlAction({
      problemId: problem.id,
      query: code,
    });
    setResult({
      submittedOn: new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }),
      executionTimeMs: res.executionTimeMs,
      rowsReturned: res.rowsReturned,
      correct: res.correct,
      passedDatasets: res.passedDatasets,
      totalDatasets: res.totalDatasets,
      reason: res.reason,
      error: res.error,
    });
    setIsSubmitting(false);
    // Refresh the submissions list so it's up-to-date when the user opens the tab.
    fetchMySubmissions();
  }

  const hasExpectedOutput = problem.expectedResultColumns.length > 0 && problem.expectedResultRows.length > 0;

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
            {(["description", "solution", "submissions"] as const).map((t) => (
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
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">category</span>
                      <span>{problem.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">storage</span>
                      <span>SQLite</span>
                    </div>
                  </div>
                </div>
                {problem.description && (
                  <p className="font-body-md text-body-md leading-relaxed text-on-surface">{problem.description}</p>
                )}
                {problem.schemaSql && (
                  <div>
                    <p className="font-headline-md text-[14px] mb-3 text-on-surface">Schema:</p>
                    <SqlCodeBlock sql={problem.schemaSql} placeholder="" />
                  </div>
                )}
                {problem.sampleDataSql && (
                  <div>
                    <p className="font-headline-md text-[14px] mb-3 text-on-surface">Sample Data:</p>
                    <SqlCodeBlock sql={problem.sampleDataSql} placeholder="" />
                  </div>
                )}
                {hasExpectedOutput && (
                  <div>
                    <p className="font-headline-md text-[14px] mb-3 text-on-surface">Sample Output:</p>
                    <ResultTable columns={problem.expectedResultColumns} rows={problem.expectedResultRows} />
                  </div>
                )}
                {problem.explanation && (
                  <div>
                    <p className="font-headline-md text-[14px] mb-2 text-on-surface">Explanation:</p>
                    <p className="font-body-md text-body-md text-on-surface-variant">{problem.explanation}</p>
                  </div>
                )}
              </>
            )}
            {leftTab === "solution" && (
              <div>
                <p className="font-headline-md text-[14px] mb-3 text-on-surface">Reference Solution:</p>
                <SqlCodeBlock sql={problem.solutionQuery} placeholder="No reference solution provided." />
              </div>
            )}
            {leftTab === "submissions" && (
              <div className="space-y-3">
                {submissionsLoading && (
                  <p className="font-body-md text-body-md text-on-surface-variant">Loading submissions…</p>
                )}
                {!submissionsLoading && mySubmissions !== null && mySubmissions.length === 0 && (
                  <p className="font-body-md text-body-md text-on-surface-variant">You haven&apos;t submitted a query for this problem yet.</p>
                )}
                {!submissionsLoading && mySubmissions !== null && mySubmissions.map((s) => (
                  <div key={s.id} className="border border-surface-container-high rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        s.verdict === "Accepted"
                          ? "bg-green-100 text-green-700"
                          : s.verdict === "Error"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {s.verdict}
                      </span>
                      <span className="text-on-surface-variant text-[11px] font-label-sm">
                        {new Date(s.submittedAt).toLocaleString("en-US", {
                          month: "short", day: "2-digit", year: "numeric",
                          hour: "numeric", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-[12px] font-label-sm">
                      {s.passedDatasets} / {s.totalDatasets} test {s.totalDatasets === 1 ? "case" : "cases"} passed
                      <span className="ml-2">· {s.executionTimeMs} ms</span>
                    </p>
                    <pre className="bg-surface-container text-on-surface-variant text-[11px] font-mono rounded p-2 overflow-x-auto whitespace-pre-wrap break-all leading-5 max-h-24">{s.query}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="flex-1 min-h-0 flex flex-col bg-surface-container p-2 gap-2 overflow-y-auto md:overflow-hidden">
          <div className="flex-1 flex flex-col bg-surface-container-lowest border border-surface-container-high rounded-lg shadow-sm overflow-hidden min-h-[300px]">
            <div className="h-12 flex items-center justify-between px-3 border-b border-surface-container-high bg-surface-container-lowest shrink-0">
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-surface-container-high font-label-md text-label-md text-on-surface bg-surface-container-low">
                SQLite
              </span>
              <div className="flex items-center gap-1.5 lg:gap-2">
                <button onClick={handleReset} className="flex items-center gap-1.5 px-2 lg:px-3 py-1.5 text-on-surface hover:bg-surface-container-low rounded-md transition-colors border border-surface-container-high font-label-md text-label-md">
                  <span className="material-symbols-outlined text-[16px]">refresh</span> <span className="hidden lg:inline">Reset</span>
                </button>
                <button onClick={handleRun} disabled={isRunning} className="flex items-center gap-1.5 px-2 lg:px-3 py-1.5 text-on-surface hover:bg-surface-container-low rounded-md transition-colors border border-surface-container-high font-label-md text-label-md disabled:opacity-50 disabled:cursor-not-allowed">
                  {isRunning
                    ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined text-[16px]">play_arrow</span>}
                  <span className="hidden lg:inline">{isRunning ? "Running…" : "Run"}</span>
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
                language="sql"
                value={code}
                onChange={(v) => {
                  const next = v ?? "";
                  setCode(next);
                  try {
                    window.localStorage.setItem(draftKey(problem.id), next);
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
              {(["expected", "output", "result"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setBottomTab(t)}
                  className={`px-2 py-3 mr-4 font-label-md text-label-md border-b-2 transition-colors capitalize ${bottomTab === t ? "text-secondary border-secondary" : "text-on-surface-variant hover:text-on-surface border-transparent"}`}
                >
                  {t === "expected" ? "Expected Output" : t}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {bottomTab === "expected" && (
                hasExpectedOutput ? (
                  <ResultTable columns={problem.expectedResultColumns} rows={problem.expectedResultRows} />
                ) : (
                  <p className="font-label-md text-[13px] text-on-surface-variant">No expected output defined for this problem.</p>
                )
              )}
              {bottomTab === "output" && (
                <div className="font-label-md text-[13px]">
                  {isRunning && (
                    <p className="text-on-surface-variant">Executing query…</p>
                  )}
                  {!ran && !isRunning && (
                    <p className="text-on-surface-variant">Click Run to see your query output.</p>
                  )}
                  {ran && !isRunning && runResult && (
                    <div className="space-y-3">
                      {runResult.error ? (
                        <div className="space-y-1">
                          <p className="text-error font-label-sm font-semibold">Error</p>
                          <pre className="text-error/90 whitespace-pre-wrap break-words font-mono text-[12px] bg-error/5 border border-error/20 rounded-md p-3">{runResult.error}</pre>
                        </div>
                      ) : (
                        <>
                          <p className="text-[#16a34a] font-label-sm">
                            {runResult.rows.length} {runResult.rows.length === 1 ? "row" : "rows"} returned
                            <span className="text-on-surface-variant ml-2">· {runResult.executionTimeMs} ms</span>
                          </p>
                          {runResult.columns.length > 0
                            ? <ResultTable columns={runResult.columns} rows={runResult.rows} />
                            : <p className="text-on-surface-variant">Query returned no rows.</p>
                          }
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {bottomTab === "result" && (
                <div>
                  {isSubmitting && (
                    <p className="font-label-md text-[13px] text-on-surface-variant">Evaluating your query…</p>
                  )}
                  {!isSubmitting && result === null && (
                    <p className="font-label-md text-[13px] text-on-surface-variant">Click Submit to see your result.</p>
                  )}
                  {!isSubmitting && result !== null && (
                    <>
                      <h2 className={`font-headline-lg text-headline-lg mb-1 ${result.correct ? "text-[#16a34a]" : "text-error"}`}>
                        {result.correct ? "Accepted" : (result.error ? "Error" : "Wrong Answer")}
                      </h2>
                      <p className="font-label-sm text-[12px] text-on-surface-variant mb-2">
                        {result.passedDatasets} / {result.totalDatasets} test {result.totalDatasets === 1 ? "case" : "cases"} passed
                      </p>
                      {!result.correct && result.reason && (
                        <p className="font-label-md text-[13px] text-on-surface-variant mb-6">{result.reason}</p>
                      )}
                      {result.correct && <div className="mb-6" />}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-on-surface-variant text-xs mb-1 font-label-sm">Execution Time</p>
                          <p className="text-on-surface font-label-md">{result.executionTimeMs} ms</p>
                        </div>
                        <div>
                          <p className="text-on-surface-variant text-xs mb-1 font-label-sm">Rows Returned</p>
                          <p className="text-on-surface font-label-md">{result.rowsReturned}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-headline-md text-[14px] text-on-surface mb-3 border-b border-surface-container-high pb-2">Submit Info</h3>
                        <div className="space-y-3 font-label-md text-[13px]">
                          <div className="flex justify-between"><span className="text-on-surface-variant">Submitted On</span><span className="text-on-surface">{result.submittedOn}</span></div>
                          <div className="flex justify-between"><span className="text-on-surface-variant">Database</span><span className="text-on-surface">SQLite</span></div>
                        </div>
                      </div>
                    </>
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
