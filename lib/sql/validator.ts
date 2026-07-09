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

  // First real token must be SELECT or WITH (CTEs).
  const firstToken = upper.trim().match(/^([A-Z]+)/)?.[1];
  if (firstToken !== "SELECT" && firstToken !== "WITH") {
    return {
      valid: false,
      error: `Only SELECT queries are allowed. Queries starting with "${firstToken ?? "(empty)"}" are not permitted.`,
    };
  }

  return { valid: true };
}
