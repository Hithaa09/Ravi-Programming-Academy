"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { InsightsRange } from "@/lib/types";

export interface SqlLeaderboardEntry {
  rank: number;
  profileId: string;
  fullName: string | null;
  email: string;
  sqlProblemsSolved: number;
  sqlAccuracy: number;
  totalSqlSubmissions: number;
  latestAcceptedSubmission: Date | null;
}

interface RawSubmission {
  studentId: string;
  problemId: number;
  verdict: string;
  submittedAt: Date;
  profile: { id: string; fullName: string | null; email: string };
}

function getRangeStart(range: InsightsRange): Date | null {
  if (range === "All Time") return null;
  const start = new Date();
  start.setDate(start.getDate() - (range === "This Week" ? 7 : 30));
  return start;
}

// Any authenticated user (student or admin) may read the leaderboard — it's
// shown on both the student and admin shells. Fully anonymous callers get
// nothing back.
async function requireAuthedUser(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
}

// Single DB round-trip for every student SQL submission ever made. Callers
// filter/aggregate this in memory per range — "This Week"/"This Month" are
// always subsets of what "All Time" already fetches, so there's no need to
// re-query per range.
async function getAllStudentSqlSubmissions(): Promise<RawSubmission[]> {
  return prisma.sqlSubmission.findMany({
    where: { profile: { role: "student" } },
    select: {
      studentId: true,
      problemId: true,
      verdict: true,
      submittedAt: true,
      profile: { select: { id: true, fullName: true, email: true } },
    },
  });
}

function aggregate(submissions: RawSubmission[], range: InsightsRange): SqlLeaderboardEntry[] {
  const rangeStart = getRangeStart(range);
  const scoped = rangeStart ? submissions.filter((s) => s.submittedAt >= rangeStart) : submissions;

  interface Agg {
    profileId: string;
    fullName: string | null;
    email: string;
    total: number;
    accepted: number;
    solvedProblemIds: Set<number>;
    latestAcceptedMs: number | null;
  }

  const byStudent = new Map<string, Agg>();

  for (const sub of scoped) {
    let agg = byStudent.get(sub.studentId);
    if (!agg) {
      agg = {
        profileId: sub.profile.id,
        fullName: sub.profile.fullName,
        email: sub.profile.email,
        total: 0,
        accepted: 0,
        solvedProblemIds: new Set(),
        latestAcceptedMs: null,
      };
      byStudent.set(sub.studentId, agg);
    }

    agg.total += 1;
    if (sub.verdict === "Accepted") {
      agg.accepted += 1;
      agg.solvedProblemIds.add(sub.problemId);
      const ts = sub.submittedAt.getTime();
      if (agg.latestAcceptedMs === null || ts > agg.latestAcceptedMs) agg.latestAcceptedMs = ts;
    }
  }

  const rows = Array.from(byStudent.values()).map((agg) => ({
    profileId: agg.profileId,
    fullName: agg.fullName,
    email: agg.email,
    sqlProblemsSolved: agg.solvedProblemIds.size,
    sqlAccuracy: agg.total > 0 ? Math.round((agg.accepted / agg.total) * 1000) / 10 : 0,
    totalSqlSubmissions: agg.total,
    latestAcceptedSubmission: agg.latestAcceptedMs !== null ? new Date(agg.latestAcceptedMs) : null,
  }));

  rows.sort((a, b) => {
    if (b.sqlProblemsSolved !== a.sqlProblemsSolved) return b.sqlProblemsSolved - a.sqlProblemsSolved;
    if (b.sqlAccuracy !== a.sqlAccuracy) return b.sqlAccuracy - a.sqlAccuracy;
    const aTime = a.latestAcceptedSubmission?.getTime() ?? -Infinity;
    const bTime = b.latestAcceptedSubmission?.getTime() ?? -Infinity;
    if (bTime !== aTime) return bTime - aTime;
    // Fully tied on every real metric — fall back to profileId so the order
    // is stable across requests instead of depending on unordered DB rows.
    return a.profileId < b.profileId ? -1 : a.profileId > b.profileId ? 1 : 0;
  });

  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

export async function getSqlLeaderboard(range: InsightsRange): Promise<SqlLeaderboardEntry[]> {
  await requireAuthedUser();
  const submissions = await getAllStudentSqlSubmissions();
  return aggregate(submissions, range);
}

// All three ranges from a single auth check + single DB query — use this
// instead of calling getSqlLeaderboard() once per range, which would re-fetch
// the same underlying submissions up to three times per page load.
export async function getSqlLeaderboardAllRanges(): Promise<Record<InsightsRange, SqlLeaderboardEntry[]>> {
  await requireAuthedUser();
  const submissions = await getAllStudentSqlSubmissions();
  return {
    "This Week": aggregate(submissions, "This Week"),
    "This Month": aggregate(submissions, "This Month"),
    "All Time": aggregate(submissions, "All Time"),
  };
}

// Total registered students, independent of SQL activity — used for the
// "Total Students" stat card so it isn't limited to students active in range.
export async function getTotalStudentCount(): Promise<number> {
  await requireAuthedUser();
  return prisma.profile.count({ where: { role: "student" } });
}
