"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/get-user";
import type { InsightsRange } from "@/lib/types";

export interface SqlLeaderboardEntry {
  rank: number;
  profileId: string;
  fullName: string | null;
  email: string;
  sqlProblemsSolved: number;
  sqlAccuracy: number;
  totalSqlSubmissions: number;
  programmingProblemsSolved: number;
  programmingAccuracy: number;
  totalProgrammingSubmissions: number;
  // Combined across both types — this is what ranking is based on.
  totalProblemsSolved: number;
  overallAccuracy: number;
  // Earliest accepted submission, used only as the final tiebreak. Rewards
  // solving early rather than most-recent activity — deliberately NOT
  // improvable by resubmitting an already-solved problem, unlike a
  // "most recent" timestamp would be.
  firstAcceptedSubmission: Date | null;
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
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
}

// Single DB round-trip for every student SQL (and, separately, Programming)
// submission ever made. Callers filter/aggregate this in memory per range —
// "This Week"/"This Month" are always subsets of what "All Time" already
// fetches, so there's no need to re-query per range.
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

async function getAllStudentProgrammingSubmissions(): Promise<RawSubmission[]> {
  return prisma.programmingSubmission.findMany({
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

interface TypeAgg {
  total: number;
  accepted: number;
  solvedProblemIds: Set<number>;
  firstAcceptedMs: number | null;
}

function emptyTypeAgg(): TypeAgg {
  return { total: 0, accepted: 0, solvedProblemIds: new Set(), firstAcceptedMs: null };
}

function tallyInto(agg: TypeAgg, sub: RawSubmission): void {
  agg.total += 1;
  if (sub.verdict === "Accepted") {
    agg.accepted += 1;
    agg.solvedProblemIds.add(sub.problemId);
    const ts = sub.submittedAt.getTime();
    if (agg.firstAcceptedMs === null || ts < agg.firstAcceptedMs) agg.firstAcceptedMs = ts;
  }
}

function accuracyOf(agg: TypeAgg): number {
  return agg.total > 0 ? Math.round((agg.accepted / agg.total) * 1000) / 10 : 0;
}

function aggregate(
  sqlSubmissions: RawSubmission[],
  programmingSubmissions: RawSubmission[],
  range: InsightsRange
): SqlLeaderboardEntry[] {
  const rangeStart = getRangeStart(range);
  const scopedSql = rangeStart ? sqlSubmissions.filter((s) => s.submittedAt >= rangeStart) : sqlSubmissions;
  const scopedProgramming = rangeStart ? programmingSubmissions.filter((s) => s.submittedAt >= rangeStart) : programmingSubmissions;

  interface Agg {
    profileId: string;
    fullName: string | null;
    email: string;
    sql: TypeAgg;
    programming: TypeAgg;
  }

  const byStudent = new Map<string, Agg>();

  function getOrCreate(sub: RawSubmission): Agg {
    let agg = byStudent.get(sub.studentId);
    if (!agg) {
      agg = {
        profileId: sub.profile.id,
        fullName: sub.profile.fullName,
        email: sub.profile.email,
        sql: emptyTypeAgg(),
        programming: emptyTypeAgg(),
      };
      byStudent.set(sub.studentId, agg);
    }
    return agg;
  }

  for (const sub of scopedSql) tallyInto(getOrCreate(sub).sql, sub);
  for (const sub of scopedProgramming) tallyInto(getOrCreate(sub).programming, sub);

  const rows = Array.from(byStudent.values()).map((agg) => {
    const totalProblemsSolved = agg.sql.solvedProblemIds.size + agg.programming.solvedProblemIds.size;
    const totalAttempts = agg.sql.total + agg.programming.total;
    const totalAccepted = agg.sql.accepted + agg.programming.accepted;
    const firstMs = [agg.sql.firstAcceptedMs, agg.programming.firstAcceptedMs]
      .filter((ms): ms is number => ms !== null)
      .reduce((min, ms) => (min === null || ms < min ? ms : min), null as number | null);

    return {
      profileId: agg.profileId,
      fullName: agg.fullName,
      email: agg.email,
      sqlProblemsSolved: agg.sql.solvedProblemIds.size,
      sqlAccuracy: accuracyOf(agg.sql),
      totalSqlSubmissions: agg.sql.total,
      programmingProblemsSolved: agg.programming.solvedProblemIds.size,
      programmingAccuracy: accuracyOf(agg.programming),
      totalProgrammingSubmissions: agg.programming.total,
      totalProblemsSolved,
      overallAccuracy: totalAttempts > 0 ? Math.round((totalAccepted / totalAttempts) * 1000) / 10 : 0,
      firstAcceptedSubmission: firstMs !== null ? new Date(firstMs) : null,
    };
  });

  rows.sort((a, b) => {
    if (b.totalProblemsSolved !== a.totalProblemsSolved) return b.totalProblemsSolved - a.totalProblemsSolved;
    if (b.overallAccuracy !== a.overallAccuracy) return b.overallAccuracy - a.overallAccuracy;
    // Earliest-solved wins ties — unlike "most recent," this can't be gamed
    // by resubmitting an already-solved problem (see firstAcceptedSubmission doc above).
    const aTime = a.firstAcceptedSubmission?.getTime() ?? Infinity;
    const bTime = b.firstAcceptedSubmission?.getTime() ?? Infinity;
    if (aTime !== bTime) return aTime - bTime;
    // Fully tied on every real metric — fall back to profileId so the order
    // is stable across requests instead of depending on unordered DB rows.
    return a.profileId < b.profileId ? -1 : a.profileId > b.profileId ? 1 : 0;
  });

  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

export async function getSqlLeaderboard(range: InsightsRange): Promise<SqlLeaderboardEntry[]> {
  await requireAuthedUser();
  const [sqlSubmissions, programmingSubmissions] = await Promise.all([
    getAllStudentSqlSubmissions(),
    getAllStudentProgrammingSubmissions(),
  ]);
  return aggregate(sqlSubmissions, programmingSubmissions, range);
}

// All three ranges from a single auth check + single set of DB queries — use
// this instead of calling getSqlLeaderboard() once per range, which would
// re-fetch the same underlying submissions up to three times per page load.
export async function getSqlLeaderboardAllRanges(): Promise<Record<InsightsRange, SqlLeaderboardEntry[]>> {
  await requireAuthedUser();
  const [sqlSubmissions, programmingSubmissions] = await Promise.all([
    getAllStudentSqlSubmissions(),
    getAllStudentProgrammingSubmissions(),
  ]);
  return {
    "This Week": aggregate(sqlSubmissions, programmingSubmissions, "This Week"),
    "This Month": aggregate(sqlSubmissions, programmingSubmissions, "This Month"),
    "All Time": aggregate(sqlSubmissions, programmingSubmissions, "All Time"),
  };
}

// Total registered students, independent of SQL activity — used for the
// "Total Students" stat card so it isn't limited to students active in range.
export async function getTotalStudentCount(): Promise<number> {
  await requireAuthedUser();
  return prisma.profile.count({ where: { role: "student" } });
}
