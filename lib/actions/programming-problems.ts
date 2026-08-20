"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Difficulty, TestCase, QuestionStatus, QuestionAvailability, AccessType } from "@/lib/types";
import { MIN_TIME_LIMIT_MS, MAX_TIME_LIMIT_MS, MIN_MEMORY_LIMIT_KB, MAX_MEMORY_LIMIT_KB } from "@/lib/execution-limits";
import { PARAM_TYPES, isValidIdentifierName, type FunctionSignature, type FunctionTestCase } from "@/lib/wrappers";
import { logError } from "@/lib/log";
import { checkRateLimit } from "@/lib/rate-limit";

const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"];
const VALID_STATUSES = ["Draft", "Published", "Archived"];
const VALID_AVAILABILITIES = ["Locked", "Available"];
const VALID_ACCESS_TYPES = ["FREE", "PREMIUM"];
export type ExecutionStyle = "FULL_PROGRAM" | "FUNCTION_ONLY";
const VALID_EXECUTION_STYLES: ExecutionStyle[] = ["FULL_PROGRAM", "FUNCTION_ONLY"];

function validateFunctionSignature(sig: FunctionSignature | null | undefined): string | null {
  if (!sig) return "A function signature is required for Function Only problems.";
  if (!sig.functionName?.trim()) return "Function name is required.";
  const nameCheck = isValidIdentifierName(sig.functionName.trim());
  if (!nameCheck.valid) return nameCheck.reason ?? "Invalid function name.";
  if (!Array.isArray(sig.params) || sig.params.length === 0) return "At least one parameter is required.";
  const seenParamNames = new Set<string>();
  for (const p of sig.params) {
    if (!p.name?.trim()) return "Every parameter needs a name.";
    const paramCheck = isValidIdentifierName(p.name.trim());
    if (!paramCheck.valid) return paramCheck.reason ?? `Invalid parameter name: ${p.name}.`;
    if (seenParamNames.has(p.name.trim())) return `Duplicate parameter name: "${p.name.trim()}". Every parameter needs a unique name.`;
    seenParamNames.add(p.name.trim());
    if (!PARAM_TYPES.includes(p.type)) return `Invalid parameter type: ${p.type}.`;
  }
  if (!PARAM_TYPES.includes(sig.returnType)) return `Invalid return type: ${sig.returnType}.`;
  return null;
}

// Returns the admin's user id — existing callers that only need the auth
// check (e.g. `await requireAdmin();`) are unaffected, since discarding a
// return value is always valid; bulkCreateProgrammingProblems uses it below
// as the rate-limit key.
async function requireAdmin(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || role !== "admin") throw new Error("Unauthorized");
  return user.id;
}

function validateProblemInput(data: ProblemFormInput): string | null {
  if (!data.title?.trim()) return "Title is required.";
  if (!VALID_DIFFICULTIES.includes(data.difficulty)) return "Invalid difficulty.";
  if (!VALID_STATUSES.includes(data.status)) return "Invalid status.";
  if (!VALID_AVAILABILITIES.includes(data.availability)) return "Invalid availability.";
  if (!VALID_ACCESS_TYPES.includes(data.accessType)) return "Invalid access type.";
  const executionStyle = data.executionStyle ?? "FULL_PROGRAM";
  if (!VALID_EXECUTION_STYLES.includes(executionStyle as ExecutionStyle)) return "Invalid execution style.";
  if (executionStyle === "FUNCTION_ONLY") {
    const sigError = validateFunctionSignature(data.functionSignature);
    if (sigError) return sigError;
  }
  if (data.timeLimitMs !== null && data.timeLimitMs !== undefined) {
    if (!Number.isFinite(data.timeLimitMs) || data.timeLimitMs < MIN_TIME_LIMIT_MS || data.timeLimitMs > MAX_TIME_LIMIT_MS) {
      return `Time limit must be between ${MIN_TIME_LIMIT_MS} and ${MAX_TIME_LIMIT_MS} ms.`;
    }
  }
  if (data.memoryLimitKb !== null && data.memoryLimitKb !== undefined) {
    if (!Number.isFinite(data.memoryLimitKb) || data.memoryLimitKb < MIN_MEMORY_LIMIT_KB || data.memoryLimitKb > MAX_MEMORY_LIMIT_KB) {
      return `Memory limit must be between ${MIN_MEMORY_LIMIT_KB} and ${MAX_MEMORY_LIMIT_KB} KB.`;
    }
  }
  if (executionStyle === "FUNCTION_ONLY") {
    // Function Only test cases have no pre-seeded blank row (the editor
    // starts empty), so a plain length check can't be satisfied by an
    // untouched default the way Full Program's could.
    if (data.status === "Published" && (data.functionHiddenTestCases ?? []).length === 0) {
      return "This problem cannot be published without at least one hidden test case — without one, grading falls back to the visible test cases shown to students, which would let them hardcode the answer instead of solving the problem. Add a hidden test case, or keep this problem as Draft.";
    }
    return null;
  }
  // Without a hidden test case, grading falls back to the visible test cases
  // — the exact input/expected pairs already shown to students on the
  // problem page — letting them hardcode the answer instead of solving it.
  // A blank test case (input/expected both empty) doesn't count: the form
  // pre-seeds one empty row by default, so a raw array-length check would
  // never actually block an admin who never touched this section.
  const meaningfulHiddenCases = (data.hiddenTestCases ?? []).filter((tc) => tc.expected?.trim());
  if (data.status === "Published" && meaningfulHiddenCases.length === 0) {
    return "This problem cannot be published without at least one hidden test case — without one, grading falls back to the visible test cases shown to students, which would let them hardcode the answer instead of solving the problem. Add a hidden test case with an expected output, or keep this problem as Draft.";
  }
  return null;
}

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
  timeLimitMs: number | null;
  memoryLimitKb: number | null;
  importedFileName: string | null;
  status: QuestionStatus;
  availability: QuestionAvailability;
  accessType: AccessType;
  executionStyle: ExecutionStyle;
  functionSignature: FunctionSignature | null;
  functionTestCases: FunctionTestCase[];
  functionHiddenTestCases: FunctionTestCase[];
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
  accessType: AccessType;
  executionStyle: ExecutionStyle;
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
  timeLimitMs?: number | null;
  memoryLimitKb?: number | null;
  status: string;
  availability: string;
  accessType: string;
  executionStyle?: string;
  functionSignature?: FunctionSignature | null;
  functionTestCases?: FunctionTestCase[];
  functionHiddenTestCases?: FunctionTestCase[];
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
    timeLimitMs: row.timeLimitMs,
    memoryLimitKb: row.memoryLimitKb,
    importedFileName: row.importedFileName,
    status: row.status as QuestionStatus,
    availability: row.availability as QuestionAvailability,
    accessType: row.accessType as AccessType,
    executionStyle: row.executionStyle as ExecutionStyle,
    functionSignature: row.functionSignature as FunctionSignature | null,
    functionTestCases: row.functionTestCases as FunctionTestCase[],
    functionHiddenTestCases: row.functionHiddenTestCases as FunctionTestCase[],
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
    select: { id: true, title: true, difficulty: true, topics: true, testCases: true, hiddenTestCases: true, functionTestCases: true, functionHiddenTestCases: true, status: true, availability: true, accessType: true, executionStyle: true, createdAt: true, updatedAt: true },
    where,
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => {
    const isFunctionOnly = r.executionStyle === "FUNCTION_ONLY";
    const testCases = isFunctionOnly ? r.functionTestCases : r.testCases;
    const hiddenTestCases = isFunctionOnly ? r.functionHiddenTestCases : r.hiddenTestCases;
    return {
      id: r.id,
      title: r.title,
      difficulty: r.difficulty as Difficulty,
      topics: r.topics as string[],
      testCaseCount: Array.isArray(testCases) ? testCases.length : 0,
      hiddenTestCaseCount: Array.isArray(hiddenTestCases) ? hiddenTestCases.length : 0,
      status: r.status as QuestionStatus,
      availability: r.availability as QuestionAvailability,
      accessType: r.accessType as AccessType,
      executionStyle: r.executionStyle as ExecutionStyle,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });
}

export async function getProblemById(id: number): Promise<ProgrammingProblemRecord | null> {
  const row = await prisma.programmingProblem.findUnique({ where: { id } });
  if (!row) return null;
  return toRecord(row);
}

export interface OfficialSolutionResult {
  unlocked: boolean;
  solutions: Record<string, string>;
}

// Reveals the admin-authored official solution(s) for a problem only after
// the requesting student has at least one Accepted submission for it —
// checked fresh against the database every call, never trusted from any
// client-side "I just got Accepted" state, so this can't be unlocked by
// merely claiming success. Admins always see it, consistent with every other
// admin exemption in this file.
export async function getOfficialSolutionIfUnlocked(problemId: number): Promise<OfficialSolutionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { unlocked: false, solutions: {} };

  const isAdmin = user.app_metadata?.role === "admin";
  if (!isAdmin) {
    const accepted = await prisma.programmingSubmission.findFirst({
      where: { studentId: user.id, problemId, verdict: "Accepted" },
      select: { id: true },
    });
    if (!accepted) return { unlocked: false, solutions: {} };
  }

  const problem = await prisma.programmingProblem.findUnique({
    where: { id: problemId },
    select: { officialSolutions: true },
  });
  return { unlocked: true, solutions: (problem?.officialSolutions as Record<string, string>) ?? {} };
}

export async function createProblem(
  data: ProblemFormInput
): Promise<{ id: number } | { error: string }> {
  await requireAdmin();
  const validationError = validateProblemInput(data);
  if (validationError) return { error: validationError };
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
        timeLimitMs: data.timeLimitMs ?? null,
        memoryLimitKb: data.memoryLimitKb ?? null,
        importedFileName: data.importedFileName ?? null,
        status: data.status,
        availability: data.availability,
        accessType: data.accessType,
        executionStyle: data.executionStyle ?? "FULL_PROGRAM",
        functionSignature: data.functionSignature ? (data.functionSignature as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        functionTestCases: (data.functionTestCases ?? []) as unknown as Prisma.InputJsonValue,
        functionHiddenTestCases: (data.functionHiddenTestCases ?? []) as unknown as Prisma.InputJsonValue,
      },
    });
    revalidatePath("/admin/programming-problems");
    return { id: problem.id };
  } catch (e) {
    logError("createProblem error", { context: { error: e instanceof Error ? e.message : String(e) } });
    return { error: "Failed to save problem. Please try again." };
  }
}

export async function updateProblem(
  id: number,
  data: ProblemFormInput
): Promise<{ error: string } | null> {
  await requireAdmin();
  const validationError = validateProblemInput(data);
  if (validationError) return { error: validationError };
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
        timeLimitMs: data.timeLimitMs ?? null,
        memoryLimitKb: data.memoryLimitKb ?? null,
        status: data.status,
        availability: data.availability,
        accessType: data.accessType,
        executionStyle: data.executionStyle ?? "FULL_PROGRAM",
        functionSignature: data.functionSignature ? (data.functionSignature as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        functionTestCases: (data.functionTestCases ?? []) as unknown as Prisma.InputJsonValue,
        functionHiddenTestCases: (data.functionHiddenTestCases ?? []) as unknown as Prisma.InputJsonValue,
      },
    });
    revalidatePath("/admin/programming-problems");
    revalidatePath(`/admin/programming-problems/${id}`);
    return null;
  } catch (e) {
    logError("updateProblem error", {
      context: { problemId: id, error: e instanceof Error ? e.message : String(e) },
    });
    return { error: "Failed to update problem. Please try again." };
  }
}

export async function deleteProblem(id: number): Promise<{ error: string } | null> {
  await requireAdmin();

  // Never silently destroy grading history — a problem with submissions
  // must be archived (status: "Archived"), not deleted. The FK is also
  // Restrict at the DB level as a backstop, but check here first for a
  // message that actually explains why.
  const submissionCount = await prisma.programmingSubmission.count({ where: { problemId: id } });
  if (submissionCount > 0) {
    return {
      error: `This problem has ${submissionCount} student submission${submissionCount === 1 ? "" : "s"} and cannot be deleted, since that would permanently erase their grading history and leaderboard standing. Set its status to "Archived" instead.`,
    };
  }

  try {
    await prisma.programmingProblem.delete({ where: { id } });
    revalidatePath("/admin/programming-problems");
    return null;
  } catch (e) {
    logError("deleteProblem error", {
      context: { problemId: id, error: e instanceof Error ? e.message : String(e) },
    });
    return { error: "Failed to delete problem. Please try again." };
  }
}

export async function bulkCreateProgrammingProblems(
  rows: ProblemFormInput[]
): Promise<{ inserted: number; error?: string }> {
  const adminId = await requireAdmin();
  const rateLimit = checkRateLimit("bulkImport", adminId);
  if (!rateLimit.allowed) {
    return { inserted: 0, error: "You're importing too frequently. Please wait a while and try again." };
  }
  const validRows = rows.filter((r) => validateProblemInput(r) === null);
  try {
    const result = await prisma.programmingProblem.createMany({
      data: validRows.map((r) => ({
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
        accessType: r.accessType,
        // Bulk CSV/document import stays Full Program-only in v1 — Function
        // Only problems require an admin-authored signature the import
        // pipeline has no way to infer.
        executionStyle: "FULL_PROGRAM",
        functionSignature: Prisma.DbNull,
        functionTestCases: [] as unknown as Prisma.InputJsonValue,
        functionHiddenTestCases: [] as unknown as Prisma.InputJsonValue,
      })),
    });
    revalidatePath("/admin/programming-problems");
    return { inserted: result.count };
  } catch (e) {
    logError("bulkCreateProgrammingProblems error", {
      context: { rowCount: validRows.length, error: e instanceof Error ? e.message : String(e) },
    });
    return { inserted: 0, error: "Failed to import problems. Please try again." };
  }
}
