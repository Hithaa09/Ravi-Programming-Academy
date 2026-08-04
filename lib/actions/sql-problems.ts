"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/log";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Difficulty, DbEngine, SqlHiddenDataset, QuestionStatus, QuestionAvailability, AccessType } from "@/lib/types";

const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"];
const VALID_STATUSES = ["Draft", "Published", "Archived"];
const VALID_AVAILABILITIES = ["Locked", "Available"];
const VALID_ACCESS_TYPES = ["FREE", "PREMIUM"];

// Returns the admin's user id — existing callers that only need the auth
// check (e.g. `await requireAdmin();`) are unaffected, since discarding a
// return value is always valid; bulkCreateSqlProblems uses it below as the
// rate-limit key.
async function requireAdmin(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || role !== "admin") throw new Error("Unauthorized");
  return user.id;
}

// A hidden dataset only actually protects grading if it has real content in
// every field that grading (lib/sql/hidden-runner.ts) depends on:
//   - dataSql: seeds the dataset's table(s) — without it, there's nothing to
//     query, so the "hidden" run is identical to running against nothing.
//   - expectedColumns: hidden-runner only calls compareSqlResults() at all
//     when `dataset.expectedColumns.length > 0` — if it's empty, the dataset
//     silently auto-passes with NO comparison performed whatsoever, which is
//     worse than no protection (it looks configured but grades nothing).
//   - expectedRows: without real row content, any comparison that does run
//     would be against a meaningless answer key.
// A count check alone isn't enough: the admin form's "Add Hidden Dataset"
// button seeds a blank placeholder — {expectedColumns: [""], expectedRows:
// [[""]]} — which has length 1, not 0, so a raw length check would never
// catch it. Every field must contain at least one genuinely non-blank value.
function isMeaningfulHiddenDataset(d: SqlHiddenDataset): boolean {
  return (
    !!d.dataSql?.trim() &&
    d.expectedColumns.some((c) => c.trim() !== "") &&
    d.expectedRows.some((row) => row.some((cell) => cell.trim() !== ""))
  );
}

function validateSqlProblemInput(data: SqlProblemFormInput): string | null {
  if (!data.title?.trim()) return "Title is required.";
  if (!VALID_DIFFICULTIES.includes(data.difficulty)) return "Invalid difficulty.";
  if (!VALID_STATUSES.includes(data.status)) return "Invalid status.";
  if (!VALID_AVAILABILITIES.includes(data.availability)) return "Invalid availability.";
  if (!VALID_ACCESS_TYPES.includes(data.accessType)) return "Invalid access type.";
  // Without a hidden dataset, submission grading falls back to comparing
  // against expectedResultColumns/Rows — the exact same data rendered to
  // students as the "Expected Output" sample. Publishing in that state lets
  // a student read the answer key straight off the page and hardcode it.
  // This check applies any time the saved status is Published (not just on
  // the Draft→Published transition), so a previously published problem can't
  // be edited back down to zero hidden datasets while staying Published.
  const meaningfulHiddenDatasets = (data.hiddenDatasets ?? []).filter(isMeaningfulHiddenDataset);
  if (data.status === "Published" && meaningfulHiddenDatasets.length === 0) {
    return "This problem cannot be published without at least one hidden dataset with real seed data and a real expected output — a blank placeholder dataset doesn't count. Without one, grading falls back to the sample Expected Output shown to students, which would let them hardcode the answer instead of solving the problem. Fill in the dataset, or keep this problem as Draft.";
  }
  return null;
}

export interface SqlProblemRecord {
  id: number;
  title: string;
  difficulty: Difficulty;
  category: string;
  description: string | null;
  explanation: string | null;
  schemaSql: string | null;
  sampleDataSql: string | null;
  expectedResultColumns: string[];
  expectedResultRows: string[][];
  hiddenDatasets: SqlHiddenDataset[];
  solutionQuery: string | null;
  dbEngine: DbEngine;
  ignoreRowOrder: boolean;
  ignoreColumnOrder: boolean;
  importedFileName: string | null;
  status: QuestionStatus;
  availability: QuestionAvailability;
  accessType: AccessType;
  createdAt: Date;
}

export interface SqlProblemListItem {
  id: number;
  title: string;
  difficulty: Difficulty;
  category: string;
  status: QuestionStatus;
  availability: QuestionAvailability;
  accessType: AccessType;
  createdAt: Date;
  updatedAt: Date;
}

export interface SqlProblemFormInput {
  title: string;
  difficulty: string;
  category: string;
  description: string;
  explanation: string;
  schemaSql: string;
  sampleDataSql: string;
  expectedResultColumns: string[];
  expectedResultRows: string[][];
  hiddenDatasets: SqlHiddenDataset[];
  solutionQuery: string;
  dbEngine: string;
  ignoreRowOrder: boolean;
  ignoreColumnOrder: boolean;
  status: string;
  availability: string;
  accessType: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecord(row: any): SqlProblemRecord {
  // JSON columns may be null when a problem was saved before these fields existed.
  // Normalise here so consumers never receive null arrays.
  const expectedResultColumns: string[] =
    Array.isArray(row.expectedResultColumns) && row.expectedResultColumns.length
      ? (row.expectedResultColumns as string[])
      : [];
  const expectedResultRows: string[][] =
    Array.isArray(row.expectedResultRows) && row.expectedResultRows.length
      ? (row.expectedResultRows as string[][])
      : [];
  const hiddenDatasets: SqlHiddenDataset[] = Array.isArray(row.hiddenDatasets)
    ? (row.hiddenDatasets as SqlHiddenDataset[]).map((d) => ({
        ...d,
        expectedColumns:
          Array.isArray(d.expectedColumns) && d.expectedColumns.length ? d.expectedColumns : [],
        expectedRows:
          Array.isArray(d.expectedRows) && d.expectedRows.length ? d.expectedRows : [],
      }))
    : [];

  return {
    id: row.id,
    title: row.title,
    difficulty: row.difficulty as Difficulty,
    category: row.category,
    description: row.description,
    explanation: row.explanation,
    schemaSql: row.schemaSql,
    sampleDataSql: row.sampleDataSql,
    expectedResultColumns,
    expectedResultRows,
    hiddenDatasets,
    solutionQuery: row.solutionQuery,
    dbEngine: row.dbEngine as DbEngine,
    ignoreRowOrder: row.ignoreRowOrder,
    ignoreColumnOrder: row.ignoreColumnOrder,
    importedFileName: row.importedFileName,
    status: row.status as QuestionStatus,
    availability: row.availability as QuestionAvailability,
    accessType: row.accessType as AccessType,
    createdAt: row.createdAt,
  };
}

export async function getSqlProblems(filter?: {
  onlyPublished?: boolean;
  search?: string;
  difficulty?: string;
  status?: string;
  availability?: string;
}): Promise<SqlProblemListItem[]> {
  const where: Prisma.SqlProblemWhereInput = {};
  if (filter?.onlyPublished) {
    where.status = "Published";
  } else if (filter?.status) {
    where.status = filter.status;
  }
  if (filter?.difficulty) where.difficulty = filter.difficulty;
  if (filter?.availability) where.availability = filter.availability;
  if (filter?.search) where.title = { contains: filter.search, mode: "insensitive" };

  const rows = await prisma.sqlProblem.findMany({
    select: { id: true, title: true, difficulty: true, category: true, status: true, availability: true, accessType: true, createdAt: true, updatedAt: true },
    where,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    difficulty: r.difficulty as Difficulty,
    category: r.category,
    status: r.status as QuestionStatus,
    availability: r.availability as QuestionAvailability,
    accessType: r.accessType as AccessType,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function getSqlProblemById(id: number): Promise<SqlProblemRecord | null> {
  const row = await prisma.sqlProblem.findUnique({ where: { id } });
  if (!row) return null;
  return toRecord(row);
}

export async function createSqlProblem(
  data: SqlProblemFormInput
): Promise<{ id: number } | { error: string }> {
  await requireAdmin();
  const validationError = validateSqlProblemInput(data);
  if (validationError) return { error: validationError };
  try {
    const problem = await prisma.sqlProblem.create({
      data: {
        title: data.title,
        difficulty: data.difficulty,
        category: data.category,
        description: data.description || null,
        explanation: data.explanation || null,
        schemaSql: data.schemaSql || null,
        sampleDataSql: data.sampleDataSql || null,
        expectedResultColumns: data.expectedResultColumns as unknown as Prisma.InputJsonValue,
        expectedResultRows: data.expectedResultRows as unknown as Prisma.InputJsonValue,
        hiddenDatasets: data.hiddenDatasets as unknown as Prisma.InputJsonValue,
        solutionQuery: data.solutionQuery || null,
        dbEngine: data.dbEngine,
        ignoreRowOrder: data.ignoreRowOrder,
        ignoreColumnOrder: data.ignoreColumnOrder,
        status: data.status,
        availability: data.availability,
        accessType: data.accessType,
      },
    });
    revalidatePath("/admin/sql-problems");
    return { id: problem.id };
  } catch (e) {
    logError("createSqlProblem error", { context: { error: e instanceof Error ? e.message : String(e) } });
    return { error: "Failed to save problem. Please try again." };
  }
}

export async function updateSqlProblem(
  id: number,
  data: SqlProblemFormInput
): Promise<{ error: string } | null> {
  await requireAdmin();
  const validationError = validateSqlProblemInput(data);
  if (validationError) return { error: validationError };
  try {
    await prisma.sqlProblem.update({
      where: { id },
      data: {
        title: data.title,
        difficulty: data.difficulty,
        category: data.category,
        description: data.description || null,
        explanation: data.explanation || null,
        schemaSql: data.schemaSql || null,
        sampleDataSql: data.sampleDataSql || null,
        expectedResultColumns: data.expectedResultColumns as unknown as Prisma.InputJsonValue,
        expectedResultRows: data.expectedResultRows as unknown as Prisma.InputJsonValue,
        hiddenDatasets: data.hiddenDatasets as unknown as Prisma.InputJsonValue,
        solutionQuery: data.solutionQuery || null,
        dbEngine: data.dbEngine,
        ignoreRowOrder: data.ignoreRowOrder,
        ignoreColumnOrder: data.ignoreColumnOrder,
        status: data.status,
        availability: data.availability,
        accessType: data.accessType,
      },
    });
    revalidatePath("/admin/sql-problems");
    revalidatePath(`/admin/sql-problems/${id}`);
    return null;
  } catch (e) {
    logError("updateSqlProblem error", {
      context: { problemId: id, error: e instanceof Error ? e.message : String(e) },
    });
    return { error: "Failed to update problem. Please try again." };
  }
}

export async function deleteSqlProblem(id: number): Promise<{ error: string } | null> {
  await requireAdmin();

  // Never silently destroy grading history — see the identical check in
  // programming-problems.ts's deleteProblem().
  const submissionCount = await prisma.sqlSubmission.count({ where: { problemId: id } });
  if (submissionCount > 0) {
    return {
      error: `This problem has ${submissionCount} student submission${submissionCount === 1 ? "" : "s"} and cannot be deleted, since that would permanently erase their grading history and leaderboard standing. Set its status to "Archived" instead.`,
    };
  }

  try {
    await prisma.sqlProblem.delete({ where: { id } });
    revalidatePath("/admin/sql-problems");
    return null;
  } catch (e) {
    logError("deleteSqlProblem error", {
      context: { problemId: id, error: e instanceof Error ? e.message : String(e) },
    });
    return { error: "Failed to delete problem. Please try again." };
  }
}

export async function bulkCreateSqlProblems(
  rows: SqlProblemFormInput[]
): Promise<{ inserted: number; error?: string }> {
  const adminId = await requireAdmin();
  const rateLimit = checkRateLimit("bulkImport", adminId);
  if (!rateLimit.allowed) {
    return { inserted: 0, error: "You're importing too frequently. Please wait a while and try again." };
  }
  const validRows = rows.filter((r) => validateSqlProblemInput(r) === null);
  try {
    const result = await prisma.sqlProblem.createMany({
      data: validRows.map((r) => ({
        title: r.title,
        difficulty: r.difficulty,
        category: r.category,
        description: r.description || null,
        explanation: r.explanation || null,
        schemaSql: r.schemaSql || null,
        sampleDataSql: r.sampleDataSql || null,
        expectedResultColumns: r.expectedResultColumns as unknown as Prisma.InputJsonValue,
        expectedResultRows: r.expectedResultRows as unknown as Prisma.InputJsonValue,
        hiddenDatasets: r.hiddenDatasets as unknown as Prisma.InputJsonValue,
        solutionQuery: r.solutionQuery || null,
        dbEngine: r.dbEngine,
        ignoreRowOrder: r.ignoreRowOrder,
        ignoreColumnOrder: r.ignoreColumnOrder,
        status: r.status,
        availability: r.availability,
        accessType: r.accessType,
      })),
    });
    revalidatePath("/admin/sql-problems");
    return { inserted: result.count };
  } catch (e) {
    logError("bulkCreateSqlProblems error", {
      context: { rowCount: validRows.length, error: e instanceof Error ? e.message : String(e) },
    });
    return { inserted: 0, error: "Failed to import problems. Please try again." };
  }
}
