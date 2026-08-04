"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/get-user";
import { logError } from "@/lib/log";

async function getAuth(): Promise<{ userId: string; email: string; isAdmin: boolean } | null> {
  const user = await getAuthUser();
  if (!user) return null;
  const role = user.app_metadata?.role as string | undefined;
  return { userId: user.id, email: user.email ?? "", isAdmin: role === "admin" };
}

export interface SqlSubmissionRecord {
  id: number;
  studentId: string;
  studentEmail: string;
  problemId: number;
  problemTitle: string;
  problemDifficulty: string;
  query: string;
  verdict: string;
  executionTimeMs: number;
  passedDatasets: number;
  totalDatasets: number;
  submittedAt: Date;
}

export interface CreateSqlSubmissionInput {
  studentId: string;
  studentEmail: string;
  problemId: number;
  problemTitle: string;
  query: string;
  verdict: string;
  executionTimeMs: number;
  passedDatasets: number;
  totalDatasets: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecord(row: any): SqlSubmissionRecord {
  return {
    id: row.id,
    studentId: row.studentId,
    studentEmail: row.studentEmail,
    problemId: row.problemId,
    problemTitle: row.problemTitle,
    problemDifficulty: row.problem?.difficulty ?? "",
    query: row.query,
    verdict: row.verdict,
    executionTimeMs: row.executionTimeMs,
    passedDatasets: row.passedDatasets,
    totalDatasets: row.totalDatasets,
    submittedAt: row.submittedAt,
  };
}

const withProblem = { problem: { select: { difficulty: true } } } as const;

export async function createSqlSubmission(
  data: CreateSqlSubmissionInput
): Promise<SqlSubmissionRecord | null> {
  try {
    // Verify the caller is authenticated and is submitting under their own identity.
    const auth = await getAuth();
    if (!auth || auth.userId !== data.studentId) return null;

    const row = await prisma.sqlSubmission.create({
      data,
      include: withProblem,
    });
    return toRecord(row);
  } catch (e) {
    logError("createSqlSubmission error", {
      userId: data.studentId,
      context: { error: e instanceof Error ? e.message : String(e) },
    });
    return null;
  }
}

export async function getSqlSubmissionsByStudent(
  studentId: string,
  problemId?: number
): Promise<SqlSubmissionRecord[]> {
  // Admins may query any student; students may only query themselves.
  const auth = await getAuth();
  if (!auth) return [];
  if (!auth.isAdmin && auth.userId !== studentId) return [];

  const rows = await prisma.sqlSubmission.findMany({
    where: { studentId, ...(problemId !== undefined ? { problemId } : {}) },
    include: withProblem,
    orderBy: { submittedAt: "desc" },
  });
  return rows.map(toRecord);
}

export async function getSqlSubmissionById(
  id: number
): Promise<SqlSubmissionRecord | null> {
  // Only admins may look up arbitrary submission IDs.
  const auth = await getAuth();
  if (!auth || !auth.isAdmin) return null;

  const row = await prisma.sqlSubmission.findUnique({
    where: { id },
    include: withProblem,
  });
  return row ? toRecord(row) : null;
}

export async function getAllSqlSubmissions(filter?: {
  search?: string;
  verdict?: string;
}): Promise<SqlSubmissionRecord[]> {
  // Only admins may retrieve all submissions.
  const auth = await getAuth();
  if (!auth || !auth.isAdmin) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (filter?.verdict) where.verdict = filter.verdict;
  if (filter?.search) {
    where.OR = [
      { problemTitle: { contains: filter.search, mode: "insensitive" } },
      { studentEmail: { contains: filter.search, mode: "insensitive" } },
    ];
  }
  const rows = await prisma.sqlSubmission.findMany({
    where,
    include: withProblem,
    orderBy: { submittedAt: "desc" },
    take: 500,
  });
  return rows.map(toRecord);
}

// Returns submissions for the currently authenticated student for one problem.
export async function getMySubmissionsForProblem(
  problemId: number
): Promise<SqlSubmissionRecord[]> {
  const user = await getAuthUser();
  if (!user) return [];
  return getSqlSubmissionsByStudent(user.id, problemId);
}
