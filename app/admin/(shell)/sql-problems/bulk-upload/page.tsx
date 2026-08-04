"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { bulkCreateSqlProblems } from "@/lib/actions/sql-problems";
import type { SqlProblemFormInput } from "@/lib/actions/sql-problems";

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
const STATUSES = ["Draft", "Published", "Archived"] as const;
const AVAILABILITIES = ["Locked", "Available"] as const;
// Queries always execute against SQLite (see lib/sql/sql-worker.cjs) —
// only the true execution engine is accepted here now.
const DB_ENGINES = ["SQLite"] as const;

interface ParsedRow {
  rowNumber: number;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  explanation: string;
  schemaSql: string;
  sampleDataSql: string;
  solutionQuery: string;
  dbEngine: string;
  ignoreRowOrder: boolean;
  ignoreColumnOrder: boolean;
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
    const category = get("category");
    if (!category) errors.push("category is required");
    const rawStatus = get("status");
    const status = rawStatus || "Draft";
    if (rawStatus && !STATUSES.includes(rawStatus as typeof STATUSES[number]))
      errors.push(`status must be one of: ${STATUSES.join(", ")}`);
    // CSV import never carries hidden datasets (the format has no column for
    // them — see handleConfirm below, which always sends hiddenDatasets: []).
    // Publishing without one would let students see their own grading answer
    // key as the sample Expected Output, so the server rejects it too — this
    // just surfaces that as a clear per-row reason instead of a silent skip.
    if (status === "Published")
      errors.push(`SQL problems can't be published via CSV import (no hidden dataset can be provided this way) — import as Draft, then add a hidden dataset and publish from the Edit page.`);
    const rawAvailability = get("availability");
    const availability = rawAvailability || "Locked";
    if (rawAvailability && !AVAILABILITIES.includes(rawAvailability as typeof AVAILABILITIES[number]))
      errors.push(`availability must be one of: ${AVAILABILITIES.join(", ")}`);
    const rawDbEngine = get("dbEngine");
    const dbEngine = rawDbEngine || "SQLite";
    if (rawDbEngine && !DB_ENGINES.includes(rawDbEngine as typeof DB_ENGINES[number]))
      errors.push(`dbEngine must be one of: ${DB_ENGINES.join(", ")}`);
    const rawIgnoreRow = get("ignoreRowOrder");
    const ignoreRowOrder = rawIgnoreRow === "" ? true : rawIgnoreRow.toLowerCase() !== "false";
    const rawIgnoreCol = get("ignoreColumnOrder");
    const ignoreColumnOrder = rawIgnoreCol === "" ? true : rawIgnoreCol.toLowerCase() !== "false";
    result.push({
      rowNumber: i,
      title,
      difficulty,
      category,
      description: get("description"),
      explanation: get("explanation"),
      schemaSql: get("schemaSql"),
      sampleDataSql: get("sampleDataSql"),
      solutionQuery: get("solutionQuery"),
      dbEngine,
      ignoreRowOrder,
      ignoreColumnOrder,
      status,
      availability,
      valid: errors.length === 0,
      errors,
    });
  }
  return result;
}

const TEMPLATE_CSV = [
  "title,difficulty,category,description,explanation,schemaSql,sampleDataSql,solutionQuery,dbEngine,ignoreRowOrder,ignoreColumnOrder,status,availability",
  "Employee Salary,Easy,Aggregation,Find the average salary of all employees.,Use the AVG() aggregate function.,CREATE TABLE employees (id INT PRIMARY KEY),INSERT INTO employees VALUES (1),SELECT AVG(salary) FROM employees,MySQL,true,true,Draft,Locked",
].join("\n");

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sql-problems-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkUploadSqlPage() {
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
    const validRows: SqlProblemFormInput[] = parsedRows
      .filter((r) => r.valid)
      .map((r) => ({
        title: r.title,
        difficulty: r.difficulty,
        category: r.category,
        description: r.description,
        explanation: r.explanation,
        schemaSql: r.schemaSql,
        sampleDataSql: r.sampleDataSql,
        expectedResultColumns: [],
        expectedResultRows: [],
        hiddenDatasets: [],
        solutionQuery: r.solutionQuery,
        dbEngine: r.dbEngine,
        ignoreRowOrder: r.ignoreRowOrder,
        ignoreColumnOrder: r.ignoreColumnOrder,
        status: r.status,
        availability: r.availability,
        // CSV import has no column for this yet — every bulk-imported
        // problem starts FREE; mark it Premium from the Edit page if needed.
        accessType: "FREE",
      }));
    const res = await bulkCreateSqlProblems(validRows);
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
        <Button onClick={() => router.push("/admin/sql-problems")}>
          Go to SQL Problems
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
                  <th className="px-6 py-4">Category</th>
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
                      <td className="px-6 py-4 text-on-surface-variant">{row.category || "—"}</td>
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
        <h1 className="font-headline-xl text-headline-xl text-on-surface">CSV Import — SQL Problems</h1>
        <Button variant="secondary" onClick={() => router.back()}>
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
        </Button>
      </div>

      <div className="flex items-start gap-3 bg-secondary/5 border border-secondary/20 rounded-lg p-4 mb-6 max-w-3xl">
        <span className="material-symbols-outlined text-secondary">info</span>
        <div className="font-body-md text-body-md text-on-surface space-y-1">
          <p>Upload a CSV file to bulk-import SQL problems.</p>
          <p><strong>Required:</strong> title, difficulty (Easy / Medium / Hard), category</p>
          <p><strong>Optional:</strong> description, explanation, schemaSql, sampleDataSql, solutionQuery, dbEngine (SQLite), ignoreRowOrder (true/false), ignoreColumnOrder (true/false), status (Draft / Published / Archived), availability (Locked / Available)</p>
          <p><strong>Note:</strong> rows with status = Published will be rejected — CSV import can&apos;t include hidden datasets, and publishing without one isn&apos;t allowed. Import as Draft, then add a hidden dataset and publish from the Edit page.</p>
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
