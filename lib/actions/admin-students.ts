"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/log";
import { recordAuditLog } from "@/lib/audit-log";

// ─── Auth guard ───────────────────────────────────────────────────────────────

// Returns the admin's own id — existing callers that only need the check
// (`await requireAdmin();`) are unaffected, since discarding a return value
// is always valid; callers that also need to record an audit entry use it
// as the adminId without a second getUser() round trip.
async function requireAdmin(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || role !== "admin") throw new Error("Unauthorized");
  return user.id;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  hasLifetimeAccess: boolean;
  createdAt: Date;
}

export interface StudentPurchase {
  id: number;
  provider: string;
  providerReference: string | null;
  amount: number | null;
  currency: string;
  status: string;
  createdAt: Date;
}

export interface StudentDetail extends StudentProfile {
  purchases: StudentPurchase[];
}

export interface StudentListResult {
  students: StudentProfile[];
  total: number;
}

export interface StudentStats {
  totalSubmissions: number;
  sqlProblemsSolved: number;
  sqlAccuracy: number;
  programmingSubmissionsCount: number;
  programmingProblemsSolved: number;
  programmingAccuracy: number;
  recentSubmissions: {
    id: number;
    type: "sql" | "programming";
    language: string;
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
        hasLifetimeAccess: true,
        createdAt: true,
      },
    }),
    prisma.profile.count({ where }),
  ]);

  return { students, total };
}

// ─── Student detail ───────────────────────────────────────────────────────────

export async function getStudentById(id: string): Promise<StudentDetail | null> {
  await requireAdmin();

  const profile = await prisma.profile.findFirst({
    where: { id, role: "student" },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      hasLifetimeAccess: true,
      createdAt: true,
      purchases: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          provider: true,
          providerReference: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  return profile;
}

export async function getStudentStats(studentId: string): Promise<StudentStats> {
  await requireAdmin();

  const [sqlSubs, programmingSubs] = await Promise.all([
    prisma.sqlSubmission.findMany({
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
    }),
    prisma.programmingSubmission.findMany({
      where: { studentId },
      select: {
        id: true,
        problemId: true,
        problemTitle: true,
        language: true,
        verdict: true,
        executionTimeMs: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  const totalSubmissions = sqlSubs.length;
  const accepted = sqlSubs.filter((s) => s.verdict === "Accepted");
  const sqlProblemsSolved = new Set(accepted.map((s) => s.problemId)).size;
  const sqlAccuracy =
    totalSubmissions > 0
      ? Math.round((accepted.length / totalSubmissions) * 1000) / 10
      : 0;

  const programmingSubmissionsCount = programmingSubs.length;
  const programmingAccepted = programmingSubs.filter((s) => s.verdict === "Accepted");
  const programmingProblemsSolved = new Set(programmingAccepted.map((s) => s.problemId)).size;
  const programmingAccuracy =
    programmingSubmissionsCount > 0
      ? Math.round((programmingAccepted.length / programmingSubmissionsCount) * 1000) / 10
      : 0;

  const recentSubmissions = [
    ...sqlSubs.map((s) => ({ id: s.id, type: "sql" as const, language: "SQL", problemTitle: s.problemTitle, verdict: s.verdict, executionTimeMs: s.executionTimeMs, submittedAt: s.submittedAt })),
    ...programmingSubs.map((s) => ({ id: s.id, type: "programming" as const, language: s.language, problemTitle: s.problemTitle, verdict: s.verdict, executionTimeMs: s.executionTimeMs, submittedAt: s.submittedAt })),
  ]
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
    .slice(0, 5);

  return {
    totalSubmissions,
    sqlProblemsSolved,
    sqlAccuracy,
    programmingSubmissionsCount,
    programmingProblemsSolved,
    programmingAccuracy,
    recentSubmissions,
  };
}

// ─── Activate / Suspend ───────────────────────────────────────────────────────

export async function activateStudent(studentId: string): Promise<void> {
  const adminId = await requireAdmin();
  await prisma.profile.updateMany({
    where: { id: studentId, role: "student" },
    data: { status: "active" },
  });
  await recordAuditLog(adminId, "student.activate", { targetType: "student", targetId: studentId });
}

export async function suspendStudent(studentId: string): Promise<void> {
  const adminId = await requireAdmin();
  await prisma.profile.updateMany({
    where: { id: studentId, role: "student" },
    data: { status: "suspended" },
  });
  await recordAuditLog(adminId, "student.suspend", { targetType: "student", targetId: studentId });
}

// ─── Create student ───────────────────────────────────────────────────────────
// Requires SUPABASE_SERVICE_ROLE_KEY in env. Returns an error string if the
// service role key is not configured or if Supabase rejects the request.

export async function createStudent(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{ error: string | null }> {
  const adminId = await requireAdmin();

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

  try {
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
  } catch (profileError) {
    const profileErrorMessage = profileError instanceof Error ? profileError.message : String(profileError);
    logError("createStudent: Profile creation failed, rolling back Supabase Auth user", {
      context: { supabaseUserId: data.user.id, email: input.email, error: profileErrorMessage },
    });

    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(data.user.id);
    if (deleteError) {
      logError("createStudent: rollback failed — orphaned Supabase Auth user requires manual cleanup", {
        context: { supabaseUserId: data.user.id, email: input.email, error: deleteError.message },
      });
      return { error: "Failed to create student account. The account may be in an inconsistent state — please contact support before retrying with this email." };
    }

    return { error: "Failed to create student account. No account was left behind — please try again." };
  }

  await recordAuditLog(adminId, "student.create", { targetType: "student", targetId: data.user.id, details: { email: input.email } });
  return { error: null };
}
