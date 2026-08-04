// Forbidden SQL keywords for student queries.
// Schema and sample-data SQL (instructor-authored) bypasses this validator entirely.
const FORBIDDEN: string[] = [
  "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE",
  "ATTACH", "DETACH", "VACUUM", "REINDEX", "ANALYZE",
  "REPLACE", "UPSERT", "PRAGMA", "EXPLAIN",
];

// Strip SQL syntax that can hide keywords so the regex scan is reliable.
function stripLiteralsAndComments(sql: string): string {
  // Block comments /* ... */
  let s = sql.replace(/\/\*[\s\S]*?\*\//g, " ");
  // Single-line comments -- ...
  s = s.replace(/--[^\r\n]*/g, " ");
  // Single-quoted string literals  'value'
  s = s.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  // Double-quoted identifiers  "column"
  s = s.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  // Backtick-quoted identifiers (SQLite non-standard)  `column`
  s = s.replace(/`[^`]*`/g, "``");
  return s;
}

export function validateStudentQuery(query: string): { valid: true } | { valid: false; error: string } {
  const stripped = stripLiteralsAndComments(query);
  const upper = stripped.toUpperCase();

  for (const kw of FORBIDDEN) {
    if (new RegExp(`\\b${kw}\\b`).test(upper)) {
      return {
        valid: false,
        error: `Only read-only SELECT queries are allowed. "${kw}" statements are not permitted.`,
      };
    }
  }

  // \bPRAGMA\b alone misses SQLite's pragma table-valued functions, e.g.
  // "SELECT * FROM pragma_table_info('x')" — the underscore means there's no
  // word boundary between PRAGMA and TABLE_INFO, so the check above never
  // fires. Catch the function-call form explicitly.
  if (/\bPRAGMA_[A-Z_]*\s*\(/.test(upper)) {
    return {
      valid: false,
      error: `Only read-only SELECT queries are allowed. Pragma functions are not permitted.`,
    };
  }

  // First real token must be SELECT or WITH (CTEs).
  const firstToken = upper.trim().match(/^([A-Z]+)/)?.[1];
  if (firstToken !== "SELECT" && firstToken !== "WITH") {
    return {
      valid: false,
      error: `Only SELECT queries are allowed. Queries starting with "${firstToken ?? "(empty)"}" are not permitted.`,
    };
  }

  // Recursive CTEs have no row/step limit enforced anywhere downstream and
  // can hang the process (e.g. an unbounded WITH RECURSIVE self-join) —
  // block them at the door rather than let one query stall the whole server.
  if (firstToken === "WITH" && /^WITH\s+RECURSIVE\b/.test(upper.trim())) {
    return {
      valid: false,
      error: `Recursive CTEs ("WITH RECURSIVE") are not permitted.`,
    };
  }

  return { valid: true };
}
