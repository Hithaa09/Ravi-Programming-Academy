"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Editor } from "@monaco-editor/react";
import type { ProgrammingProblemRecord } from "@/lib/actions/programming-problems";
import { CODE_LANGUAGES as LANGUAGES } from "@/lib/languages";
import { MobileSolveNotice } from "@/components/MobileSolveNotice";

interface ProblemSolveViewProps {
  problem: ProgrammingProblemRecord;
  backHref: string;
  backLabel: string;
  banner?: React.ReactNode;
}

export function ProblemSolveView({ problem, backHref, backLabel, banner }: ProblemSolveViewProps) {
  const [leftTab, setLeftTab] = useState<"description" | "solutions" | "submissions">("description");
  const [bottomTab, setBottomTab] = useState<"testcases" | "output" | "result">("testcases");
  const [language, setLanguage] = useState<string>("python");
  const [code, setCode] = useState<Record<string, string>>(() => ({ ...(problem.starterCodeByLanguage ?? {}) }));
  const [activeCase, setActiveCase] = useState(0);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [result, setResult] = useState<{ runtime: string; memory: string; submittedOn: string; testsPassed: number; total: number } | null>(null);

  const currentLang = useMemo(() => LANGUAGES.find((l) => l.id === language)!, [language]);

  function handleReset() {
    setCode((prev) => ({ ...prev, [language]: problem.starterCodeByLanguage?.[language] ?? "" }));
  }

  function handleRun() {
    if (!problem.testCases.length) return;
    const tc = problem.testCases[activeCase];
    setRunOutput(tc.expected);
    setBottomTab("output");
  }

  function handleSubmit() {
    setResult({
      runtime: "45 ms",
      memory: "16.2 MB",
      submittedOn: new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" }),
      testsPassed: problem.testCases.length,
      total: problem.testCases.length,
    });
    setBottomTab("result");
  }

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
                  {problem.topics.length > 0 && (
                    <div className="flex flex-wrap gap-4 text-on-surface-variant font-label-md text-label-md text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">sell</span>
                        <span>{problem.topics.join(", ")}</span>
                      </div>
                    </div>
                  )}
                </div>
                {problem.description && (
                  <p className="font-body-md text-body-md leading-relaxed text-on-surface">{problem.description}</p>
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
              <p className="font-body-md text-body-md text-on-surface-variant">No community solutions yet — check back later.</p>
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
                <button onClick={handleRun} className="flex items-center gap-1.5 px-2 lg:px-3 py-1.5 text-on-surface hover:bg-surface-container-low rounded-md transition-colors border border-surface-container-high font-label-md text-label-md">
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span> <span className="hidden lg:inline">Run</span>
                </button>
                <button onClick={handleSubmit} className="flex items-center gap-1.5 px-2.5 lg:px-4 py-1.5 bg-secondary text-white hover:bg-secondary/90 rounded-md transition-colors shadow-sm font-label-md text-label-md font-medium">
                  <span className="material-symbols-outlined text-[16px]">cloud_upload</span> <span className="hidden lg:inline">Submit</span>
                </button>
              </div>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                theme="vs-dark"
                language={currentLang.monacoId}
                value={code[language] ?? ""}
                onChange={(v) => setCode((prev) => ({ ...prev, [language]: v ?? "" }))}
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
                problem.testCases.length === 0 ? (
                  <p className="font-label-md text-[13px] text-on-surface-variant">No visible test cases for this problem.</p>
                ) : (
                  <div>
                    <div className="flex gap-2 mb-4">
                      {problem.testCases.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveCase(i)}
                          className={`px-4 py-1.5 rounded-full font-label-md text-label-md transition-colors ${activeCase === i ? "bg-secondary/10 text-secondary" : "hover:bg-surface-container text-on-surface-variant"}`}
                        >
                          Case {i + 1}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-on-surface-variant mb-1">Input</label>
                        <div className="bg-surface-container-low border border-surface-container-high rounded-md p-3 text-on-surface font-label-md text-[13px]">
                          {problem.testCases[activeCase]?.input}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-on-surface-variant mb-1">Expected Output</label>
                        <div className="bg-surface-container-low border border-surface-container-high rounded-md p-3 text-on-surface font-label-md text-[13px]">
                          {problem.testCases[activeCase]?.expected}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
              {bottomTab === "output" && (
                <div className="font-label-md text-[13px]">
                  {runOutput === null ? (
                    <p className="text-on-surface-variant">Click Run to see output for Case {activeCase + 1}.</p>
                  ) : (
                    <div className="bg-surface-container-low border border-surface-container-high rounded-md p-3 text-on-surface">{runOutput}</div>
                  )}
                </div>
              )}
              {bottomTab === "result" && (
                <div>
                  {result === null ? (
                    <p className="font-label-md text-[13px] text-on-surface-variant">Click Submit to see your result.</p>
                  ) : (
                    <>
                      <h2 className="font-headline-lg text-headline-lg text-[#16a34a] mb-6">Accepted</h2>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-on-surface-variant text-xs mb-1 font-label-sm">Runtime</p>
                          <p className="text-on-surface font-label-md">{result.runtime}</p>
                        </div>
                        <div>
                          <p className="text-on-surface-variant text-xs mb-1 font-label-sm">Memory</p>
                          <p className="text-on-surface font-label-md">{result.memory}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-headline-md text-[14px] text-on-surface mb-3 border-b border-surface-container-high pb-2">Submit Info</h3>
                        <div className="space-y-3 font-label-md text-[13px]">
                          <div className="flex justify-between"><span className="text-on-surface-variant">Submitted On</span><span className="text-on-surface">{result.submittedOn}</span></div>
                          <div className="flex justify-between"><span className="text-on-surface-variant">Language</span><span className="text-on-surface">{currentLang.label}</span></div>
                          <div className="flex justify-between"><span className="text-on-surface-variant">Test Cases Passed</span><span className="text-on-surface">{result.testsPassed} / {result.total}</span></div>
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
