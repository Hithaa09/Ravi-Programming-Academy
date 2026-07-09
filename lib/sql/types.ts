export interface SqlRunInput {
  schemaSql: string | null;
  sampleDataSql: string | null;
  query: string;
}

export interface SqlRunResult {
  columns: string[];
  rows: string[][];
  executionTimeMs: number;
  error?: string;
}
