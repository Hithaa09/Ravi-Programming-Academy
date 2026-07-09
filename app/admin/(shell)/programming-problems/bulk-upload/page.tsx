"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { bulkCreateProgrammingProblems } from "@/lib/actions/programming-problems";
import type { ProblemFormInput } from "@/lib/actions/programming-problems";

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
const STATUSES = ["Draft", "Published", "Archived"] as const;
const AVAILABILITIES = ["Locked", "Available"] as const;

interface ParsedRow {
  rowNumber: number;
  title: string;
  difficulty: string;
  topics: string[];
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  sampleInput: string;
  sampleOutput: string;
  explanation: string;
  status: string;
  availability: string;
  valid: boolean;
  errors: string[];
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') { inQuotes = false; i++; continue; }
      field += ch; i++;
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ""; i++; continue; }
      if (ch === '\n' || ch === '\r') {
        row.push(field); field = "";
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (ch === '\r' && text[i + 1] === '\n') i++;
        i++; continue;
      }
      field += ch; i++;
    }
  }
  if (field || row.length > 0) { row.push(field); if (row.some(Boolean)) rows.push(row); }
  return rows;
}

function parseAndValidate(csvText: string): ParsedRow[] {
  const rawRows = parseCSV(csvText.trim());
  if (rawRows.length < 2) return [];
  const headers = rawRows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name.toLowerCase());
  const result: ParsedRow[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const cells = rawRows[i];
    const get = (name: string) => (cells[idx(name)] ?? "").trim();
    const errors: string[] = [];
    const title = get("title");
    if (!title) errors.push("title is required");
    const difficulty = get("difficulty");
    if (!difficulty) errors.push("difficulty is required");
    else if (!DIFFICULTIES.includes(difficulty as typeof DIFFICULTIES[number]))
      errors.push(`difficulty must be one of: ${DIFFICULTIES.join(", ")}`);
    const rawStatus = get("status");
    const status = rawStatus || "Draft";
    if (rawStatus && !STATUSES.includes(rawStatus as typeof STATUSES[number]))
      errors.push(`status must be one of: ${STATUSES.join(", ")}`);
    const rawAvailability = get("availability");
    const availability = rawAvailability || "Locked";
    if (rawAvailability && !AVAILABILITIES.includes(rawAvailability as typeof AVAILABILITIES[number]))
      errors.push(`availability must be one of: ${AVAILABILITIES.join(", ")}`);
    const topicsRaw = get("topics");
    const topics = topicsRaw ? topicsRaw.split("|").map((t) => t.trim()).filter(Boolean) : [];
    const constraintsRaw = get("constraints");
    const constraints = constraintsRaw ? constraintsRaw.split("|").map((c) => c.trim()).filter(Boolean) : [];
    result.push({
      rowNumber: i,
      title,
      difficulty,
      topics,
      description: get("description"),
      inputFormat: get("inputFormat"),
      outputFormat: get("outputFormat"),
      constraints,
      sampleInput: get("sampleInput"),
      sampleOutput: get("sampleOutput"),
      explanation: get("explanation"),
      status,
      availability,
      valid: errors.length === 0,
      errors,
    });
  }
  return result;
}

const TEMPLATE_CSV = [
  "title,difficulty,topics,description,inputFormat,outputFormat,constraints,sampleInput,sampleOutput,explanation,status,availability",
  "Two Sum,Easy,Arrays|Hash Maps,Find two numbers that add up to target.,Array of integers and a target,Two indices (0-indexed),1 <= nums.length <= 10^4|Each element fits in a 32-bit integer,2 7 11 15 target=9,0 1,nums[0] + nums[1] equals the target,Draft,Locked",
].join("\n");

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "programming-problems-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkUploadProgrammingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [view, setView] = useState<"upload" | "preview" | "result">("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; error?: string } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileContent(await file.text());
  }

  function handlePreview() {
    if (!fileContent) return;
    setParsedRows(parseAndValidate(fileContent));
    setView("preview");
  }

  async function handleConfirm() {
    setImporting(true);
    const validRows: ProblemFormInput[] = parsedRows
      .filter((r) => r.valid)
      .map((r) => ({
        title: r.title,
        difficulty: r.difficulty,
        topics: r.topics,
        description: r.description,
        inputFormat: r.inputFormat,
        outputFormat: r.outputFormat,
        constraints: r.constraints,
        sampleInput: r.sampleInput,
        sampleOutput: r.sampleOutput,
        explanation: r.explanation,
        testCases: [],
        hiddenTestCases: [],
        starterCodeByLanguage: {},
        officialSolutions: {},
        status: r.status,
        availability: r.availability,
      }));
    const res = await bulkCreateProgrammingProblems(validRows);
    setImportResult(res);
    setView("result");
    setImporting(false);
  }

  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.filter((r) => !r.valid).length;

  if (view === "result" && importResult) {
    return (
      <div className="max-w-container-max mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Import Complete</h1>
        </div>
        {importResult.error ? (
          <div className="flex items-start gap-3 bg-error/5 border border-error/20 rounded-lg p-4 mb-6 max-w-2xl">
            <span className="material-symbols-outlined text-error">error</span>
            <p className="font-body-md text-body-md text-on-surface">{importResult.error}</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 max-w-2xl">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <p className="font-body-md text-body-md text-on-surface">
              Successfully imported <span className="font-bold">{importResult.inserted}</span> problem{importResult.inserted !== 1 ? "s" : ""}.
              {invalidCount > 0 && ` ${invalidCount} invalid row${invalidCount !== 1 ? "s" : ""} were skipped.`}
            </p>
          </div>
        )}
        <Button onClick={() => router.push("/admin/programming-problems")}>
          Go to Programming Problems
        </Button>
      </div>
    );
  }

  if (view === "preview") {
    return (
      <div className="max-w-container-max mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-headline-xl text-headline-xl text-on-surface">
            Preview — {parsedRows.length} Row{parsedRows.length !== 1 ? "s" : ""}
          </h1>
          <Button variant="secondary" onClick={() => setView("upload")}>
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
          </Button>
        </div>

        <div className="flex items-start gap-3 bg-secondary/5 border border-secondary/20 rounded-lg p-4 mb-6">
          <span className="material-symbols-outlined text-secondary">info</span>
          <p className="font-body-md text-body-md text-on-surface">
            <span className="font-bold text-emerald-600">{validCount}</span> valid row{validCount !== 1 ? "s" : ""} will be imported.{" "}
            {invalidCount > 0 && (
              <span><span className="font-bold text-rose-600">{invalidCount}</span> invalid row{invalidCount !== 1 ? "s" : ""} will be skipped.</span>
            )}
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-card overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low/50 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-4">#</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Difficulty</th>
                  <th className="px-6 py-4">Topics</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-sm">
                {parsedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center font-body-md text-body-md text-on-surface-variant">
                      No data rows found in CSV.
                    </td>
                  </tr>
                ) : (
                  parsedRows.map((row) => (
                    <tr key={row.rowNumber} className={`transition-colors ${row.valid ? "hover:bg-surface-container-low/40" : "bg-rose-50/60"}`}>
                      <td className="px-4 py-4 text-on-surface-variant">{row.rowNumber}</td>
                      <td className="px-6 py-4 font-medium text-on-surface max-w-[240px]">
                        <div className="line-clamp-2" title={row.title}>{row.title || "—"}</div>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{row.difficulty || "—"}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{row.topics.join(", ") || "—"}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{row.status}</td>
                      <td className="px-6 py-4">
                        {row.valid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-label-md text-label-md font-medium">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span> Valid
                          </span>
                        ) : (
                          <span className="inline-flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-rose-600 font-label-md text-label-md font-medium">
                              <span className="material-symbols-outlined text-[16px]">cancel</span> Invalid
                            </span>
                            {row.errors.map((err, ei) => (
                              <span key={ei} className="font-label-sm text-label-sm text-rose-500">{err}</span>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={() => setView("upload")}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={validCount === 0 || importing}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? "Importing…" : `Import ${validCount} Problem${validCount !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">CSV Import — Programming Problems</h1>
        <Button variant="secondary" onClick={() => router.back()}>
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
        </Button>
      </div>

      <div className="flex items-start gap-3 bg-secondary/5 border border-secondary/20 rounded-lg p-4 mb-6 max-w-3xl">
        <span className="material-symbols-outlined text-secondary">info</span>
        <div className="font-body-md text-body-md text-on-surface space-y-1">
          <p>Upload a CSV file to bulk-import programming problems.</p>
          <p><strong>Required:</strong> title, difficulty (Easy / Medium / Hard)</p>
          <p><strong>Optional:</strong> topics (pipe-separated), description, inputFormat, outputFormat, constraints (pipe-separated), sampleInput, sampleOutput, explanation, status (Draft / Published / Archived), availability (Locked / Available)</p>
          <p className="pt-0.5">
            <button type="button" onClick={downloadTemplate} className="text-secondary underline font-medium hover:text-secondary/80 transition-colors">
              Download CSV template
            </button>
          </p>
        </div>
      </div>

      <div className="space-y-6 max-w-3xl">
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload CSV file"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-outline-variant/40 rounded-xl py-16 cursor-pointer hover:bg-surface-container-low/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">upload_file</span>
          <p className="font-headline-md text-headline-md text-on-surface">{fileName ?? "Select CSV File"}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Click to browse (.csv)</p>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button
            type="button"
            onClick={handlePreview}
            disabled={!fileContent}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview
          </Button>
        </div>
      </div>
    </div>
  );
}
