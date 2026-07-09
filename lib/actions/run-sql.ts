"use server";

import { runSql } from "@/lib/sql/runner";
import type { SqlRunInput, SqlRunResult } from "@/lib/sql/types";

export async function runSqlAction(input: SqlRunInput): Promise<SqlRunResult> {
  return runSql(input);
}
