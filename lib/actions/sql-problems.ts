"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Difficulty, DbEngine, SqlHiddenDataset, QuestionStatus, QuestionAvailability } from "@/lib/types";

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
  createdAt: Date;
}

export interface SqlProblemListItem {
  id: number;
  title: string;
  difficulty: Difficulty;
  category: string;
  status: QuestionStatus;
  availability: QuestionAvailability;
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
    select: { id: true, title: true, difficulty: true, category: true, status: true, availability: true, createdAt: true, updatedAt: true },
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
      },
    });
    revalidatePath("/admin/sql-problems");
    return { id: problem.id };
  } catch (e) {
    console.error("createSqlProblem error:", e);
    return { error: "Failed to save problem. Please try again." };
  }
}

export async function updateSqlProblem(
  id: number,
  data: SqlProblemFormInput
): Promise<{ error: string } | null> {
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
      },
    });
    revalidatePath("/admin/sql-problems");
    revalidatePath(`/admin/sql-problems/${id}`);
    return null;
  } catch (e) {
    console.error("updateSqlProblem error:", e);
    return { error: "Failed to update problem. Please try again." };
  }
}

export async function deleteSqlProblem(id: number): Promise<{ error: string } | null> {
  try {
    await prisma.sqlProblem.delete({ where: { id } });
    revalidatePath("/admin/sql-problems");
    return null;
  } catch (e) {
    console.error("deleteSqlProblem error:", e);
    return { error: "Failed to delete problem. Please try again." };
  }
}

export async function bulkCreateSqlProblems(
  rows: SqlProblemFormInput[]
): Promise<{ inserted: number; error?: string }> {
  try {
    const result = await prisma.sqlProblem.createMany({
      data: rows.map((r) => ({
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
      })),
    });
    revalidatePath("/admin/sql-problems");
    return { inserted: result.count };
  } catch (e) {
    console.error("bulkCreateSqlProblems error:", e);
    return { inserted: 0, error: "Failed to import problems. Please try again." };
  }
}
