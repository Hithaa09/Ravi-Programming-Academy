"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/get-user";
import { getSqlSubmissionsByStudent } from "@/lib/actions/sql-submissions";
import { getProgrammingSubmissionsByStudent } from "@/lib/actions/programming-submissions";
import type { Difficulty } from "@/lib/types";

// Minimal shape the streak/heatmap/difficulty helpers actually need — both
// SqlSubmissionRecord and ProgrammingSubmissionRecord satisfy this, so those
// helpers can run over a combined SQL + Programming activity feed.
interface SubmissionLike {
  submittedAt: Date;
  verdict: string;
  problemId: number;
  problemDifficulty: string;
}

export interface RecentSubmissionItem {
  id: number;
  type: "sql" | "programming";
  language: string;
  problemTitle: string;
  verdict: string;
  executionTimeMs: number;
  submittedAt: Date;
}

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
const RECENT_SUBMISSIONS_LIMIT = 5;
// Heatmap window — 13 full weeks so the UI can lay it out as a clean 13x7
// grid with no partial trailing column.
const WEEKLY_ACTIVITY_WINDOW_DAYS = 91;

export interface DifficultyProgress {
  solved: number;
  total: number;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD, local server time
  count: number;
}

export interface StudentDashboardData {
  profileId: string;
  fullName: string | null;
  email: string;
  sqlProblemsSolved: number;
  sqlAttempts: number;
  sqlAccuracy: number;
  sqlProgressByDifficulty: Record<Difficulty, DifficultyProgress>;
  programmingProblemsSolved: number;
  programmingAttempts: number;
  programmingAccuracy: number;
  programmingProgressByDifficulty: Record<Difficulty, DifficultyProgress>;
  weeklyActivity: DailyActivity[];
  currentStreak: number;
  recentSubmissions: RecentSubmissionItem[];
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeWeeklyActivity(submissions: SubmissionLike[]): DailyActivity[] {
  const counts = new Map<string, number>();
  for (const s of submissions) {
    const key = toDateKey(s.submittedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days: DailyActivity[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (WEEKLY_ACTIVITY_WINDOW_DAYS - 1));

  for (let i = 0; i < WEEKLY_ACTIVITY_WINDOW_DAYS; i++) {
    const key = toDateKey(cursor);
    days.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

// Consecutive-day streak, walking backward from today. If nothing was
// submitted today yet, the streak is still "alive" as long as yesterday had
// activity — it only breaks once a full day is skipped entirely.
function computeStreak(submissions: SubmissionLike[]): number {
  const activeDays = new Set(submissions.map((s) => toDateKey(s.submittedAt)));

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  let cursor: Date;
  if (activeDays.has(toDateKey(today))) {
    cursor = today;
  } else if (activeDays.has(toDateKey(yesterday))) {
    cursor = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  while (activeDays.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeSolvedByDifficulty(submissions: SubmissionLike[]): Record<Difficulty, number> {
  const solvedProblemIds: Record<Difficulty, Set<number>> = {
    Easy: new Set(),
    Medium: new Set(),
    Hard: new Set(),
  };

  const knownDifficulties: string[] = DIFFICULTIES;

  for (const s of submissions) {
    if (s.verdict !== "Accepted") continue;
    if (!knownDifficulties.includes(s.problemDifficulty)) continue;
    solvedProblemIds[s.problemDifficulty as Difficulty].add(s.problemId);
  }

  return {
    Easy: solvedProblemIds.Easy.size,
    Medium: solvedProblemIds.Medium.size,
    Hard: solvedProblemIds.Hard.size,
  };
}

// Catalog size per difficulty — a separate table (SqlProblem, not
// SqlSubmission), so this is a genuinely distinct query, not a duplicate of
// the submissions fetch. Matches the same "status: Published" filter the
// student-facing /sql browse page already uses (getSqlProblems({ onlyPublished: true })),
// so "total" here means the same set of problems a student can actually see.
async function getSqlCatalogTotalsByDifficulty(): Promise<Record<Difficulty, number>> {
  const counts = await prisma.sqlProblem.groupBy({
    by: ["difficulty"],
    where: { status: "Published" },
    _count: true,
  });

  const totals: Record<Difficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
  const knownDifficulties: string[] = DIFFICULTIES;
  for (const row of counts) {
    if (knownDifficulties.includes(row.difficulty)) totals[row.difficulty as Difficulty] = row._count;
  }
  return totals;
}

// Same reasoning as getSqlCatalogTotalsByDifficulty, for the Programming catalog.
async function getProgrammingCatalogTotalsByDifficulty(): Promise<Record<Difficulty, number>> {
  const counts = await prisma.programmingProblem.groupBy({
    by: ["difficulty"],
    where: { status: "Published" },
    _count: true,
  });

  const totals: Record<Difficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
  const knownDifficulties: string[] = DIFFICULTIES;
  for (const row of counts) {
    if (knownDifficulties.includes(row.difficulty)) totals[row.difficulty as Difficulty] = row._count;
  }
  return totals;
}

export async function getStudentDashboardData(): Promise<StudentDashboardData> {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  // Single DB round-trip each for every SQL and Programming submission this
  // student has ever made — every submission-derived metric below comes
  // from these two arrays, never re-queried. Profile (name/email) and the
  // two problem-catalog counts are separate tables entirely, so fetching
  // them isn't a duplicate of the submissions queries — everything runs
  // concurrently in one Promise.all.
  const [profile, sqlSubmissions, programmingSubmissions, sqlCatalogTotals, programmingCatalogTotals] = await Promise.all([
    prisma.profile.findUnique({ where: { id: user.id }, select: { fullName: true, email: true } }),
    getSqlSubmissionsByStudent(user.id),
    getProgrammingSubmissionsByStudent(user.id),
    getSqlCatalogTotalsByDifficulty(),
    getProgrammingCatalogTotalsByDifficulty(),
  ]);

  const sqlAccepted = sqlSubmissions.filter((s) => s.verdict === "Accepted");
  const sqlProblemsSolved = new Set(sqlAccepted.map((s) => s.problemId)).size;
  const sqlAttempts = sqlSubmissions.length;
  const sqlAccuracy = sqlAttempts > 0 ? Math.round((sqlAccepted.length / sqlAttempts) * 1000) / 10 : 0;

  const sqlSolvedByDifficulty = computeSolvedByDifficulty(sqlSubmissions);
  const sqlProgressByDifficulty: Record<Difficulty, DifficultyProgress> = {
    Easy: { solved: sqlSolvedByDifficulty.Easy, total: sqlCatalogTotals.Easy },
    Medium: { solved: sqlSolvedByDifficulty.Medium, total: sqlCatalogTotals.Medium },
    Hard: { solved: sqlSolvedByDifficulty.Hard, total: sqlCatalogTotals.Hard },
  };

  const programmingAccepted = programmingSubmissions.filter((s) => s.verdict === "Accepted");
  const programmingProblemsSolved = new Set(programmingAccepted.map((s) => s.problemId)).size;
  const programmingAttempts = programmingSubmissions.length;
  const programmingAccuracy = programmingAttempts > 0 ? Math.round((programmingAccepted.length / programmingAttempts) * 1000) / 10 : 0;

  const programmingSolvedByDifficulty = computeSolvedByDifficulty(programmingSubmissions);
  const programmingProgressByDifficulty: Record<Difficulty, DifficultyProgress> = {
    Easy: { solved: programmingSolvedByDifficulty.Easy, total: programmingCatalogTotals.Easy },
    Medium: { solved: programmingSolvedByDifficulty.Medium, total: programmingCatalogTotals.Medium },
    Hard: { solved: programmingSolvedByDifficulty.Hard, total: programmingCatalogTotals.Hard },
  };

  // Weekly activity and streak reflect all coding activity, not just SQL —
  // neither widget is SQL-specific in the UI.
  const allSubmissions: SubmissionLike[] = [...sqlSubmissions, ...programmingSubmissions];

  const recentSubmissions: RecentSubmissionItem[] = [
    ...sqlSubmissions.map((s): RecentSubmissionItem => ({
      id: s.id, type: "sql", language: "SQL", problemTitle: s.problemTitle,
      verdict: s.verdict, executionTimeMs: s.executionTimeMs, submittedAt: s.submittedAt,
    })),
    ...programmingSubmissions.map((s): RecentSubmissionItem => ({
      id: s.id, type: "programming", language: s.language, problemTitle: s.problemTitle,
      verdict: s.verdict, executionTimeMs: s.executionTimeMs, submittedAt: s.submittedAt,
    })),
  ]
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
    .slice(0, RECENT_SUBMISSIONS_LIMIT);

  return {
    profileId: user.id,
    fullName: profile?.fullName ?? null,
    email: profile?.email ?? user.email ?? "",
    sqlProblemsSolved,
    sqlAttempts,
    sqlAccuracy,
    sqlProgressByDifficulty,
    programmingProblemsSolved,
    programmingAttempts,
    programmingAccuracy,
    programmingProgressByDifficulty,
    weeklyActivity: computeWeeklyActivity(allSubmissions),
    currentStreak: computeStreak(allSubmissions),
    recentSubmissions,
  };
}
