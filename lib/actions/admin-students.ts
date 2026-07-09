"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role ?? user?.app_metadata?.role;
  if (!user || role !== "admin") throw new Error("Unauthorized");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  createdAt: Date;
}

export interface StudentListResult {
  students: StudentProfile[];
  total: number;
}

export interface StudentStats {
  totalSubmissions: number;
  sqlProblemsSolved: number;
  sqlAccuracy: number;
  recentSubmissions: {
    id: number;
    problemTitle: string;
    verdict: string;
    executionTimeMs: number;
    submittedAt: Date;
  }[];
}

// ─── List students ────────────────────────────────────────────────────────────

export async function getStudents(options: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<StudentListResult> {
  await requireAdmin();

  const { search, status, page = 1, pageSize = 25 } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { role: "student" };

  if (status && status !== "all") where.status = status;

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { fullName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [students, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.profile.count({ where }),
  ]);

  return { students, total };
}

// ─── Student detail ───────────────────────────────────────────────────────────

export async function getStudentById(id: string): Promise<StudentProfile | null> {
  await requireAdmin();

  const profile = await prisma.profile.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return profile;
}

export async function getStudentStats(studentId: string): Promise<StudentStats> {
  await requireAdmin();

  const allSubs = await prisma.sqlSubmission.findMany({
    where: { studentId },
    select: {
      id: true,
      problemId: true,
      problemTitle: true,
      verdict: true,
      executionTimeMs: true,
      submittedAt: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  const totalSubmissions = allSubs.length;
  const accepted = allSubs.filter((s) => s.verdict === "Accepted");
  const sqlProblemsSolved = new Set(accepted.map((s) => s.problemId)).size;
  const sqlAccuracy =
    totalSubmissions > 0
      ? Math.round((accepted.length / totalSubmissions) * 1000) / 10
      : 0;

  return {
    totalSubmissions,
    sqlProblemsSolved,
    sqlAccuracy,
    recentSubmissions: allSubs.slice(0, 5).map((s) => ({
      id: s.id,
      problemTitle: s.problemTitle,
      verdict: s.verdict,
      executionTimeMs: s.executionTimeMs,
      submittedAt: s.submittedAt,
    })),
  };
}

// ─── Activate / Suspend ───────────────────────────────────────────────────────

export async function activateStudent(studentId: string): Promise<void> {
  await requireAdmin();
  await prisma.profile.update({
    where: { id: studentId },
    data: { status: "active" },
  });
}

export async function suspendStudent(studentId: string): Promise<void> {
  await requireAdmin();
  await prisma.profile.update({
    where: { id: studentId },
    data: { status: "suspended" },
  });
}

// ─── Create student ───────────────────────────────────────────────────────────
// Requires SUPABASE_SERVICE_ROLE_KEY in env. Returns an error string if the
// service role key is not configured or if Supabase rejects the request.

export async function createStudent(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{ error: string | null }> {
  await requireAdmin();

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to .env.local to enable student creation." };
  }

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    user_metadata: { full_name: input.fullName },
    email_confirm: true,
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "User creation succeeded but no user was returned." };

  await prisma.profile.upsert({
    where: { id: data.user.id },
    update: {},
    create: {
      id: data.user.id,
      email: input.email,
      fullName: input.fullName || null,
      role: "student",
      status: "active",
    },
  });

  return { error: null };
}
