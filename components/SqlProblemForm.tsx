"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DbEngine, SqlHiddenDataset, QuestionStatus, QuestionAvailability } from "@/lib/types";
import type { SqlProblemRecord } from "@/lib/actions/sql-problems";
import { createSqlProblem, updateSqlProblem, deleteSqlProblem } from "@/lib/actions/sql-problems";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Difficulty } from "@/lib/types";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
const DB_ENGINES: DbEngine[] = ["MySQL", "PostgreSQL", "SQLite"];
const QUESTION_STATUSES: QuestionStatus[] = ["Draft", "Published", "Archived"];
const QUESTION_AVAILABILITIES: QuestionAvailability[] = ["Locked", "Available"];

type EntryMethod = "manual" | "import";

interface SqlProblemFormProps {
  mode: "create" | "edit";
  backHref: string;
  cancelHref: string;
  initial?: SqlProblemRecord | null;
}

function emptyDataset(): SqlHiddenDataset {
  return { schemaSql: "", dataSql: "", expectedColumns: [""], expectedRows: [[""]] };
}

function fieldClass(extra = "") {
  return `w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary ${extra}`;
}

function codeEditorClass(extra = "") {
  return `w-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm leading-6 p-4 resize-none outline-none ${extra}`;
}

function CodeField({
  label, description, value, onChange, placeholder, rows = 6,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">{label}</label>
      {description && <p className="font-body-md text-body-md text-on-surface-variant mb-2">{description}</p>}
      <div className="rounded-xl overflow-hidden border border-outline-variant/20">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          rows={rows}
          placeholder={placeholder}
          className={codeEditorClass()}
        />
      </div>
    </div>
  );
}

function OutputGridEditor({
  columns, rows, onColumnsChange, onRowsChange, onBothChange,
}: {
  columns: string[];
  rows: string[][];
  onColumnsChange: (next: string[]) => void;
  onRowsChange: (next: string[][]) => void;
  /** When both columns and rows must update atomically (e.g. hidden datasets share one state object),
   *  provide this callback so the two updates don't overwrite each other via React batching. */
  onBothChange?: (nextColumns: string[], nextRows: string[][]) => void;
}) {
  function addColumn() {
    const nextCols = [...columns, ""];
    const nextRows = rows.map((r) => [...r, ""]);
    if (onBothChange) { onBothChange(nextCols, nextRows); return; }
    onColumnsChange(nextCols);
    onRowsChange(nextRows);
  }
  function removeColumn(idx: number) {
    const nextCols = columns.filter((_, i) => i !== idx);
    const nextRows = rows.map((r) => r.filter((_, i) => i !== idx));
    if (onBothChange) { onBothChange(nextCols, nextRows); return; }
    onColumnsChange(nextCols);
    onRowsChange(nextRows);
  }
  function updateCell(rIdx: number, cIdx: number, value: string) {
    onRowsChange(rows.map((r, ri) => (ri === rIdx ? r.map((c, ci) => (ci === cIdx ? value : c)) : r)));
  }
  function addRow() {
    onRowsChange([...rows, columns.map(() => "")]);
  }
  function removeRow(idx: number) {
    onRowsChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="overflow-x-auto border border-outline-variant/20 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-lowest">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className="px-2 py-2 border-b border-outline-variant/20">
                  <div className="flex items-center gap-1">
                    <input
                      value={c}
                      onChange={(e) => onColumnsChange(columns.map((col, ci) => (ci === i ? e.target.value : col)))}
                      placeholder={`Column ${i + 1}`}
                      className="w-full px-2 py-1 bg-white border border-outline-variant/40 rounded-md text-sm font-bold focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                    {columns.length > 1 && (
                      <button type="button" onClick={() => removeColumn(i)} className="text-on-surface-variant hover:text-error transition-colors shrink-0" aria-label="Remove column">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-10 border-b border-outline-variant/20" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-outline-variant/10 last:border-0">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-2 py-1.5">
                    <input
                      value={cell}
                      onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-outline-variant/40 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </td>
                ))}
                <td className="px-2">
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(rIdx)} className="text-on-surface-variant hover:text-error transition-colors" aria-label="Remove row">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <Button type="button" variant="secondary" onClick={addColumn}>
          <span className="material-symbols-outlined text-[18px]">add</span> Add Column
        </Button>
        <Button type="button" variant="secondary" onClick={addRow}>
          <span className="material-symbols-outlined text-[18px]">add</span> Add Row
        </Button>
      </div>
    </div>
  );
}

function HiddenDatasetEditor({
  datasets, onChange,
}: {
  datasets: SqlHiddenDataset[];
  onChange: (next: SqlHiddenDataset[]) => void;
}) {
  function updateField(idx: number, field: "schemaSql" | "dataSql", value: string) {
    onChange(datasets.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  }
  function updateColumns(idx: number, columns: string[]) {
    onChange(datasets.map((d, i) => (i === idx ? { ...d, expectedColumns: columns } : d)));
  }
  function updateRows(idx: number, rows: string[][]) {
    onChange(datasets.map((d, i) => (i === idx ? { ...d, expectedRows: rows } : d)));
  }
  function updateBoth(idx: number, columns: string[], rows: string[][]) {
    onChange(datasets.map((d, i) => (i === idx ? { ...d, expectedColumns: columns, expectedRows: rows } : d)));
  }
  function remove(idx: number) {
    onChange(datasets.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-headline-md text-body-lg font-semibold text-on-surface">Hidden Test Datasets</h3>
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">lock</span>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mb-4">
        Used only during submission grading — never shown to students.
      </p>
      <div className="space-y-4">
        {datasets.length === 0 ? (
          <div className="flex items-center justify-center py-8 border border-dashed border-outline-variant/40 rounded-xl text-on-surface-variant font-body-md text-body-md">
            No hidden datasets yet. Click &ldquo;Add Hidden Dataset&rdquo; to add one.
          </div>
        ) : (
          datasets.map((d, idx) => (
            <div key={idx} className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md font-bold text-on-surface">Dataset {idx + 1}</span>
                <button type="button" onClick={() => remove(idx)} className="text-on-surface-variant hover:text-error transition-colors" aria-label={`Remove dataset ${idx + 1}`}>
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Schema SQL (optional — leave blank to use problem schema)</label>
                <div className="rounded-lg overflow-hidden border border-outline-variant/20">
                  <textarea
                    value={d.schemaSql ?? ""}
                    onChange={(e) => updateField(idx, "schemaSql", e.target.value)}
                    spellCheck={false}
                    rows={2}
                    placeholder="CREATE TABLE ... (only if this dataset needs a different schema)"
                    className={codeEditorClass("text-xs")}
                  />
                </div>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Data SQL</label>
                <div className="rounded-lg overflow-hidden border border-outline-variant/20">
                  <textarea
                    value={d.dataSql}
                    onChange={(e) => updateField(idx, "dataSql", e.target.value)}
                    spellCheck={false}
                    rows={3}
                    placeholder="INSERT INTO ... VALUES (...);"
                    className={codeEditorClass("text-xs")}
                  />
                </div>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Expected Output</label>
                <OutputGridEditor
                  columns={d.expectedColumns}
                  rows={d.expectedRows}
                  onColumnsChange={(cols) => updateColumns(idx, cols)}
                  onRowsChange={(rowsNext) => updateRows(idx, rowsNext)}
                  onBothChange={(cols, rowsNext) => updateBoth(idx, cols, rowsNext)}
                />
              </div>
            </div>
          ))
        )}
      </div>
      <Button type="button" variant="secondary" className="mt-4" onClick={() => onChange([...datasets, emptyDataset()])}>
        <span className="material-symbols-outlined text-[18px]">add</span> Add Hidden Dataset
      </Button>
    </div>
  );
}

function FileUploadGroup({
  label, hint, accept, files, onAdd, onRemoveAt, onRemoveAll, folderPicker,
}: {
  label: string;
  hint: string;
  accept?: string;
  files: string[];
  onAdd: (files: FileList | null) => void;
  onRemoveAt: (idx: number) => void;
  onRemoveAll: () => void;
  folderPicker?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const hasFiles = files.length > 0;

  useEffect(() => {
    if (folderPicker) {
      folderInputRef.current?.setAttribute("webkitdirectory", "");
      folderInputRef.current?.setAttribute("directory", "");
    }
  }, [folderPicker]);

  return (
    <div>
      <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">{label}</label>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onAdd(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-10 cursor-pointer transition-colors ${dragOver ? "border-secondary bg-secondary/5" : "border-outline-variant/40 hover:bg-surface-container-low/50"}`}
      >
        <span className="material-symbols-outlined text-[32px] text-on-surface-variant">cloud_upload</span>
        <p className="font-body-lg text-body-lg font-semibold text-on-surface">{hasFiles ? "Replace Import" : "Upload"}</p>
        <p className="font-label-sm text-label-sm text-on-surface-variant text-center px-6">{hint}</p>
        <input ref={fileInputRef} type="file" multiple accept={accept} className="hidden" onChange={(e) => onAdd(e.target.files)} />
      </div>
      {folderPicker && (
        <div className="mt-3">
          <Button type="button" variant="secondary" onClick={() => folderInputRef.current?.click()}>
            <span className="material-symbols-outlined text-[18px]">folder_open</span>
            {hasFiles ? "Change Import" : "Upload Folder"}
          </Button>
          <input ref={folderInputRef} type="file" multiple className="hidden" onChange={(e) => onAdd(e.target.files)} />
        </div>
      )}
      {hasFiles && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm font-bold text-on-surface">{files.length} file{files.length > 1 ? "s" : ""}</span>
            <button type="button" onClick={onRemoveAll} className="font-label-sm text-label-sm text-error font-medium hover:underline">Remove All</button>
          </div>
          <div className="space-y-2">
            {files.map((name, idx) => (
              <div key={`${name}-${idx}`} className="flex items-center justify-between gap-3 bg-surface-container-low rounded-lg border border-outline-variant/20 px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-on-surface-variant shrink-0 text-[20px]">description</span>
                  <span className="font-body-md text-body-md text-on-surface truncate">{name}</span>
                </div>
                <button type="button" onClick={() => onRemoveAt(idx)} className="text-on-surface-variant hover:text-error transition-colors shrink-0" aria-label={`Remove ${name}`}>
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SqlProblemForm({ mode, backHref, cancelHref, initial }: SqlProblemFormProps) {
  const router = useRouter();

  const [entryMethod, setEntryMethod] = useState<EntryMethod>("manual");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "Easy");
  const [status, setStatus] = useState<QuestionStatus>(initial?.status ?? "Draft");
  const [availability, setAvailability] = useState<QuestionAvailability>(initial?.availability ?? "Locked");
  const [topic, setTopic] = useState(initial?.category ?? "");
  const [statement, setStatement] = useState(initial?.description ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");

  const [schemaSql, setSchemaSql] = useState(initial?.schemaSql ?? "");
  const [sampleDataSql, setSampleDataSql] = useState(initial?.sampleDataSql ?? "");

  const [outputColumns, setOutputColumns] = useState<string[]>(
    initial?.expectedResultColumns?.length ? initial.expectedResultColumns : [""]
  );
  const [outputRows, setOutputRows] = useState<string[][]>(
    initial?.expectedResultRows?.length
      ? initial.expectedResultRows.map((r) => r.map(String))
      : [[""]]
  );

  const [hiddenDatasets, setHiddenDatasets] = useState<SqlHiddenDataset[]>(
    initial?.hiddenDatasets ?? []
  );

  const [solutionQuery, setSolutionQuery] = useState(initial?.solutionQuery ?? "");

  const [dbEngine, setDbEngine] = useState<DbEngine>(initial?.dbEngine ?? "MySQL");
  const [ignoreRowOrder, setIgnoreRowOrder] = useState(initial?.ignoreRowOrder ?? false);
  const [ignoreColumnOrder, setIgnoreColumnOrder] = useState(initial?.ignoreColumnOrder ?? false);

  const [bundleFiles, setBundleFiles] = useState<string[]>(initial?.importedFileName ? [initial.importedFileName] : []);
  const [schemaFiles, setSchemaFiles] = useState<string[]>([]);
  const [seedFiles, setSeedFiles] = useState<string[]>([]);

  function addFiles(setter: (fn: (prev: string[]) => string[]) => void, files: FileList | null) {
    if (!files || files.length === 0) return;
    setter((prev) => [...prev, ...Array.from(files).map((f) => f.name)]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const data = {
      title,
      difficulty,
      category: topic,
      description: statement,
      explanation,
      schemaSql,
      sampleDataSql,
      expectedResultColumns: outputColumns,
      expectedResultRows: outputRows,
      hiddenDatasets,
      solutionQuery,
      dbEngine,
      ignoreRowOrder,
      ignoreColumnOrder,
      status,
      availability,
    };

    let result;
    if (mode === "create") {
      result = await createSqlProblem(data);
      if ("error" in result) {
        setError(result.error);
        setSaving(false);
        return;
      }
      router.push("/admin/sql-problems");
    } else {
      result = await updateSqlProblem(initial!.id, data);
      if (result && "error" in result) {
        setError(result.error);
        setSaving(false);
        return;
      }
      router.push(cancelHref);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteSqlProblem(initial!.id);
    if (result && "error" in result) {
      setError(result.error);
      setDeleting(false);
      setShowDeleteModal(false);
      return;
    }
    router.push("/admin/sql-problems");
  }

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">
          {mode === "create" ? "Add SQL Problem" : "Edit SQL Problem"}
        </h1>
        <div className="flex items-center gap-3">
          {mode === "edit" && (
            <Button type="button" variant="secondary" className="!text-error hover:!bg-error/5" onClick={() => setShowDeleteModal(true)}>
              <span className="material-symbols-outlined text-[18px]">delete</span> Delete
            </Button>
          )}
          <Button variant="secondary" onClick={() => router.push(backHref)} disabled={saving || deleting}>
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 bg-error/5 border border-error/20 rounded-lg px-4 py-3 text-error font-body-md text-body-md">
          <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
          {error}
        </div>
      )}

      <div className="flex items-center gap-8 mb-8">
        {(
          [
            { id: "manual" as const, label: "Manual Entry" },
            { id: "import" as const, label: "Import SQL Problem" },
          ]
        ).map((opt) => (
          <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sql-entry-method"
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
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
              Problem Title <span className="text-error">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter problem title"
              className={fieldClass()}
            />
          </div>

          <div className={`grid grid-cols-1 gap-6 ${status === "Published" ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
                Difficulty <span className="text-error">*</span>
              </label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className={fieldClass()}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
                Status <span className="text-error">*</span>
              </label>
              <select value={status} onChange={(e) => setStatus(e.target.value as QuestionStatus)} className={fieldClass()}>
                {QUESTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {status === "Published" && (
              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
                  Availability <span className="text-error">*</span>
                </label>
                <select value={availability} onChange={(e) => setAvailability(e.target.value as QuestionAvailability)} className={fieldClass()}>
                  {QUESTION_AVAILABILITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
                Category <span className="text-error">*</span>
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                placeholder="e.g. Joins, Subqueries"
                className={fieldClass()}
              />
            </div>
          </div>

          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">
              Problem Statement <span className="text-error">*</span>
            </label>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              required
              rows={5}
              placeholder="Describe what the query should do..."
              className={fieldClass()}
            />
          </div>

          <div>
            <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Explanation (optional)</label>
            <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} className={fieldClass()} />
          </div>

          <div className="pt-4 border-t border-outline-variant/20">
            <CodeField
              label="Schema SQL"
              description="Paste the CREATE TABLE statements that define the database structure."
              value={schemaSql}
              onChange={setSchemaSql}
              placeholder={"CREATE TABLE Employee (...);\nCREATE TABLE Department (...);"}
            />
          </div>

          <div className="pt-4 border-t border-outline-variant/20">
            <CodeField
              label="Sample Data SQL"
              description="Paste INSERT statements to seed the sample database shown to students."
              value={sampleDataSql}
              onChange={setSampleDataSql}
              placeholder={"INSERT INTO Employee VALUES (...);"}
            />
          </div>

          <div className="pt-4 border-t border-outline-variant/20">
            <h3 className="font-headline-md text-body-lg font-semibold text-on-surface mb-1">Sample Output</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-4">The expected result set students will see for the sample data above.</p>
            <OutputGridEditor columns={outputColumns} rows={outputRows} onColumnsChange={setOutputColumns} onRowsChange={setOutputRows} />
          </div>

          <div className="pt-4 border-t border-outline-variant/20">
            <HiddenDatasetEditor datasets={hiddenDatasets} onChange={setHiddenDatasets} />
          </div>

          <div className="pt-4 border-t border-outline-variant/20">
            <CodeField
              label="Reference Solution"
              description="The official solution query, used to validate submissions."
              value={solutionQuery}
              onChange={setSolutionQuery}
              placeholder="SELECT ..."
            />
          </div>

          <div className="pt-4 border-t border-outline-variant/20">
            <h3 className="font-headline-md text-body-lg font-semibold text-on-surface mb-4">Validation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">SQL Dialect</label>
                <select value={dbEngine} onChange={(e) => setDbEngine(e.target.value as DbEngine)} className={fieldClass()}>
                  {DB_ENGINES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-3 sm:pt-9">
                {[
                  { label: "Ignore Row Order", checked: ignoreRowOrder, set: setIgnoreRowOrder },
                  { label: "Ignore Column Order", checked: ignoreColumnOrder, set: setIgnoreColumnOrder },
                ].map((opt) => (
                  <label key={opt.label} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opt.checked}
                      onChange={(e) => opt.set(e.target.checked)}
                      className="w-4 h-4 accent-primary-container rounded"
                    />
                    <span className="font-body-md text-body-md text-on-surface">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.push(cancelHref)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Save Problem" : "Save Changes"}
            </Button>
          </div>
        </form>
      )}

      {entryMethod === "import" && (
        <div className="space-y-8 max-w-3xl">
          <div className="flex items-start gap-3 bg-secondary/5 border border-secondary/20 rounded-lg p-4">
            <span className="material-symbols-outlined text-secondary">info</span>
            <div className="font-body-md text-body-md text-on-surface space-y-0.5">
              <p>Upload a full bundle, or add schema and seed data files separately.</p>
              <p>Supported formats: ZIP, SQL, CSV.</p>
            </div>
          </div>

          <FileUploadGroup
            label="Bundle (ZIP / Folder)"
            hint="Drag and drop, or click to browse. Contains schema, seed data, and metadata."
            accept=".zip"
            files={bundleFiles}
            onAdd={(files) => addFiles(setBundleFiles, files)}
            onRemoveAt={(idx) => setBundleFiles((prev) => prev.filter((_, i) => i !== idx))}
            onRemoveAll={() => setBundleFiles([])}
            folderPicker
          />

          <FileUploadGroup
            label="SQL Schema Files"
            hint="CREATE TABLE statements defining the database structure."
            accept=".sql"
            files={schemaFiles}
            onAdd={(files) => addFiles(setSchemaFiles, files)}
            onRemoveAt={(idx) => setSchemaFiles((prev) => prev.filter((_, i) => i !== idx))}
            onRemoveAll={() => setSchemaFiles([])}
          />

          <FileUploadGroup
            label="Seed Data Files"
            hint="INSERT statements or CSV files with sample rows."
            accept=".sql,.csv"
            files={seedFiles}
            onAdd={(files) => addFiles(setSeedFiles, files)}
            onRemoveAt={(idx) => setSeedFiles((prev) => prev.filter((_, i) => i !== idx))}
            onRemoveAll={() => setSeedFiles([])}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.push(cancelHref)}>Cancel</Button>
            <Button type="button" onClick={() => router.push(cancelHref)}>
              {mode === "create" ? "Save Problem" : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <Modal title="Delete SQL Problem" onClose={() => setShowDeleteModal(false)} maxWidth="max-w-sm">
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
