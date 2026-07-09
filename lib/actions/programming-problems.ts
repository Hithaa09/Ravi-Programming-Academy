"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Difficulty, TestCase, QuestionStatus, QuestionAvailability } from "@/lib/types";

export interface ProgrammingProblemRecord {
  id: number;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  description: string | null;
  inputFormat: string | null;
  outputFormat: string | null;
  constraints: string[];
  sampleInput: string | null;
  sampleOutput: string | null;
  explanation: string | null;
  testCases: TestCase[];
  hiddenTestCases: TestCase[];
  starterCodeByLanguage: Record<string, string>;
  officialSolutions: Record<string, string>;
  importedFileName: string | null;
  status: QuestionStatus;
  availability: QuestionAvailability;
  createdAt: Date;
}

export interface ProblemListItem {
  id: number;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  testCaseCount: number;
  hiddenTestCaseCount: number;
  status: QuestionStatus;
  availability: QuestionAvailability;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProblemFormInput {
  title: string;
  difficulty: string;
  topics: string[];
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  sampleInput: string;
  sampleOutput: string;
  explanation: string;
  testCases: TestCase[];
  hiddenTestCases: TestCase[];
  starterCodeByLanguage: Record<string, string>;
  officialSolutions: Record<string, string>;
  status: string;
  availability: string;
  importedFileName?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecord(row: any): ProgrammingProblemRecord {
  return {
    id: row.id,
    title: row.title,
    difficulty: row.difficulty as Difficulty,
    topics: row.topics as string[],
    description: row.description,
    inputFormat: row.inputFormat,
    outputFormat: row.outputFormat,
    constraints: row.constraints as string[],
    sampleInput: row.sampleInput,
    sampleOutput: row.sampleOutput,
    explanation: row.explanation,
    testCases: row.testCases as TestCase[],
    hiddenTestCases: row.hiddenTestCases as TestCase[],
    starterCodeByLanguage: row.starterCodeByLanguage as Record<string, string>,
    officialSolutions: row.officialSolutions as Record<string, string>,
    importedFileName: row.importedFileName,
    status: row.status as QuestionStatus,
    availability: row.availability as QuestionAvailability,
    createdAt: row.createdAt,
  };
}

export async function getProblems(filter?: {
  onlyPublished?: boolean;
  search?: string;
  difficulty?: string;
  status?: string;
  availability?: string;
}): Promise<ProblemListItem[]> {
  const where: Prisma.ProgrammingProblemWhereInput = {};
  if (filter?.onlyPublished) {
    where.status = "Published";
  } else if (filter?.status) {
    where.status = filter.status;
  }
  if (filter?.difficulty) where.difficulty = filter.difficulty;
  if (filter?.availability) where.availability = filter.availability;
  if (filter?.search) where.title = { contains: filter.search, mode: "insensitive" };

  const rows = await prisma.programmingProblem.findMany({
    select: { id: true, title: true, difficulty: true, topics: true, testCases: true, hiddenTestCases: true, status: true, availability: true, createdAt: true, updatedAt: true },
    where,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    difficulty: r.difficulty as Difficulty,
    topics: r.topics as string[],
    testCaseCount: Array.isArray(r.testCases) ? r.testCases.length : 0,
    hiddenTestCaseCount: Array.isArray(r.hiddenTestCases) ? r.hiddenTestCases.length : 0,
    status: r.status as QuestionStatus,
    availability: r.availability as QuestionAvailability,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function getProblemById(id: number): Promise<ProgrammingProblemRecord | null> {
  const row = await prisma.programmingProblem.findUnique({ where: { id } });
  if (!row) return null;
  return toRecord(row);
}

export async function createProblem(
  data: ProblemFormInput
): Promise<{ id: number } | { error: string }> {
  try {
    const problem = await prisma.programmingProblem.create({
      data: {
        title: data.title,
        difficulty: data.difficulty,
        topics: data.topics,
        description: data.description || null,
        inputFormat: data.inputFormat || null,
        outputFormat: data.outputFormat || null,
        constraints: data.constraints,
        sampleInput: data.sampleInput || null,
        sampleOutput: data.sampleOutput || null,
        explanation: data.explanation || null,
        testCases: data.testCases as unknown as Prisma.InputJsonValue,
        hiddenTestCases: data.hiddenTestCases as unknown as Prisma.InputJsonValue,
        starterCodeByLanguage: data.starterCodeByLanguage as unknown as Prisma.InputJsonValue,
        officialSolutions: data.officialSolutions as unknown as Prisma.InputJsonValue,
        importedFileName: data.importedFileName ?? null,
        status: data.status,
        availability: data.availability,
      },
    });
    revalidatePath("/admin/programming-problems");
    return { id: problem.id };
  } catch (e) {
    console.error("createProblem error:", e);
    return { error: "Failed to save problem. Please try again." };
  }
}

export async function updateProblem(
  id: number,
  data: ProblemFormInput
): Promise<{ error: string } | null> {
  try {
    await prisma.programmingProblem.update({
      where: { id },
      data: {
        title: data.title,
        difficulty: data.difficulty,
        topics: data.topics,
        description: data.description || null,
        inputFormat: data.inputFormat || null,
        outputFormat: data.outputFormat || null,
        constraints: data.constraints,
        sampleInput: data.sampleInput || null,
        sampleOutput: data.sampleOutput || null,
        explanation: data.explanation || null,
        testCases: data.testCases as unknown as Prisma.InputJsonValue,
        hiddenTestCases: data.hiddenTestCases as unknown as Prisma.InputJsonValue,
        starterCodeByLanguage: data.starterCodeByLanguage as unknown as Prisma.InputJsonValue,
        officialSolutions: data.officialSolutions as unknown as Prisma.InputJsonValue,
        status: data.status,
        availability: data.availability,
      },
    });
    revalidatePath("/admin/programming-problems");
    revalidatePath(`/admin/programming-problems/${id}`);
    return null;
  } catch (e) {
    console.error("updateProblem error:", e);
    return { error: "Failed to update problem. Please try again." };
  }
}

export async function deleteProblem(id: number): Promise<{ error: string } | null> {
  try {
    await prisma.programmingProblem.delete({ where: { id } });
    revalidatePath("/admin/programming-problems");
    return null;
  } catch (e) {
    console.error("deleteProblem error:", e);
    return { error: "Failed to delete problem. Please try again." };
  }
}

export async function bulkCreateProgrammingProblems(
  rows: ProblemFormInput[]
): Promise<{ inserted: number; error?: string }> {
  try {
    const result = await prisma.programmingProblem.createMany({
      data: rows.map((r) => ({
        title: r.title,
        difficulty: r.difficulty,
        topics: r.topics,
        description: r.description || null,
        inputFormat: r.inputFormat || null,
        outputFormat: r.outputFormat || null,
        constraints: r.constraints,
        sampleInput: r.sampleInput || null,
        sampleOutput: r.sampleOutput || null,
        explanation: r.explanation || null,
        testCases: r.testCases as unknown as Prisma.InputJsonValue,
        hiddenTestCases: r.hiddenTestCases as unknown as Prisma.InputJsonValue,
        starterCodeByLanguage: r.starterCodeByLanguage as unknown as Prisma.InputJsonValue,
        officialSolutions: r.officialSolutions as unknown as Prisma.InputJsonValue,
        status: r.status,
        availability: r.availability,
      })),
    });
    revalidatePath("/admin/programming-problems");
    return { inserted: result.count };
  } catch (e) {
    console.error("bulkCreateProgrammingProblems error:", e);
    return { inserted: 0, error: "Failed to import problems. Please try again." };
  }
}
