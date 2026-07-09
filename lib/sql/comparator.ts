export interface ComparisonInput {
  studentColumns: string[];
  studentRows: string[][];
  expectedColumns: string[];
  expectedRows: string[][];
  /** When true, row order is ignored (default for most problems). */
  ignoreRowOrder: boolean;
  /** When true, column order is ignored and columns are matched by name. */
  ignoreColumnOrder: boolean;
}

export type ComparisonResult =
  | { correct: true }
  | { correct: false; reason: string };

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function normalizeCell(val: string): string {
  return val.trim();
}

function normalizeRow(row: string[]): string[] {
  return row.map(normalizeCell);
}

// Canonical sort key for a row — joins all cells with a separator that
// cannot appear in normal SQL values so rows stay distinct.
function rowSortKey(row: string[]): string {
  return row.join("\x00");
}

// ---------------------------------------------------------------------------
// Core comparator
// ---------------------------------------------------------------------------

export function compareSqlResults(input: ComparisonInput): ComparisonResult {
  let { studentColumns, studentRows, expectedColumns, expectedRows } = input;

  // Normalize all cells on both sides upfront.
  studentRows = studentRows.map(normalizeRow);
  expectedRows = expectedRows.map(normalizeRow);

  // --- Column order handling -------------------------------------------
  // When ignoreColumnOrder=true, reorder student columns (and corresponding
  // row cells) to match the expected column sequence by name.
  if (input.ignoreColumnOrder) {
    const result = reorderColumns(studentColumns, studentRows, expectedColumns);
    if (!result.ok) return { correct: false, reason: result.reason };
    studentColumns = result.columns;
    studentRows = result.rows;
  }

  // --- Column count -------------------------------------------------------
  if (studentColumns.length !== expectedColumns.length) {
    return {
      correct: false,
      reason: `Expected ${expectedColumns.length} ${expectedColumns.length === 1 ? "column" : "columns"}, got ${studentColumns.length}.`,
    };
  }

  // --- Column names (in order) -------------------------------------------
  for (let i = 0; i < expectedColumns.length; i++) {
    if (studentColumns[i].toLowerCase() !== expectedColumns[i].toLowerCase()) {
      return {
        correct: false,
        reason: `Column ${i + 1} mismatch: expected "${expectedColumns[i]}", got "${studentColumns[i]}".`,
      };
    }
  }

  // --- Row count ----------------------------------------------------------
  if (studentRows.length !== expectedRows.length) {
    const diff = expectedRows.length - studentRows.length;
    return {
      correct: false,
      reason:
        diff > 0
          ? `Expected ${expectedRows.length} ${expectedRows.length === 1 ? "row" : "rows"}, got ${studentRows.length}. ${diff} ${diff === 1 ? "row is" : "rows are"} missing.`
          : `Expected ${expectedRows.length} ${expectedRows.length === 1 ? "row" : "rows"}, got ${studentRows.length}. ${-diff} extra ${-diff === 1 ? "row" : "rows"} returned.`,
    };
  }

  // --- Row values ---------------------------------------------------------
  if (input.ignoreRowOrder) {
    const sortedStudent = [...studentRows].sort((a, b) =>
      rowSortKey(a).localeCompare(rowSortKey(b))
    );
    const sortedExpected = [...expectedRows].sort((a, b) =>
      rowSortKey(a).localeCompare(rowSortKey(b))
    );
    if (!rowArraysEqual(sortedStudent, sortedExpected)) {
      return { correct: false, reason: "Row values do not match." };
    }
  } else {
    if (!rowArraysEqual(studentRows, expectedRows)) {
      return { correct: false, reason: "Row values do not match (order-sensitive)." };
    }
  }

  return { correct: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowArraysEqual(a: string[][], b: string[][]): boolean {
  for (let i = 0; i < a.length; i++) {
    const rowA = a[i];
    const rowB = b[i];
    if (rowA.length !== rowB.length) return false;
    for (let j = 0; j < rowA.length; j++) {
      if (rowA[j] !== rowB[j]) return false;
    }
  }
  return true;
}

function reorderColumns(
  studentColumns: string[],
  studentRows: string[][],
  expectedColumns: string[]
): { ok: true; columns: string[]; rows: string[][] } | { ok: false; reason: string } {
  // Build index map: expectedColumn[i] → position in student columns.
  const indexMap: number[] = [];
  for (const col of expectedColumns) {
    const idx = studentColumns.findIndex(
      (sc) => sc.toLowerCase() === col.toLowerCase()
    );
    if (idx === -1) {
      return {
        ok: false,
        reason: `Column "${col}" is present in the expected output but missing from your result.`,
      };
    }
    indexMap.push(idx);
  }

  // Check for extra columns in student output.
  if (studentColumns.length !== expectedColumns.length) {
    return {
      ok: false,
      reason: `Expected ${expectedColumns.length} ${expectedColumns.length === 1 ? "column" : "columns"}, got ${studentColumns.length}.`,
    };
  }

  const reorderedColumns = expectedColumns.slice();
  const reorderedRows = studentRows.map((row) => indexMap.map((i) => row[i]));

  return { ok: true, columns: reorderedColumns, rows: reorderedRows };
}
