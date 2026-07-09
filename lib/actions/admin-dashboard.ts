"use server";

import { prisma } from "@/lib/prisma";
import type { InsightsRange, RecentActivityItem } from "@/lib/types";

// ─── Stat Cards ───────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalProgrammingProblems: number;
  totalSqlProblems: number;
  totalSqlSubmissions: number;
  sqlActiveStudents: number;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [totalProgrammingProblems, totalSqlProblems, totalSqlSubmissions, sqlActiveStudents] =
    await Promise.all([
      prisma.programmingProblem.count(),
      prisma.sqlProblem.count(),
      // Count only student submissions — admin test submissions are excluded.
      prisma.sqlSubmission.count({ where: { profile: { role: "student" } } }),
      prisma.profile.count({ where: { role: "student" } }),
    ]);
  return {
    totalProgrammingProblems,
    totalSqlProblems,
    totalSqlSubmissions,
    sqlActiveStudents,
  };
}

// ─── Recent Activity ──────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export async function getRecentActivity(): Promise<RecentActivityItem[]> {
  const [sqlSubmissions, programmingProblems, sqlProblems] = await Promise.all([
    prisma.sqlSubmission.findMany({
      where: { profile: { role: "student" } },
      select: {
        studentEmail: true,
        problemTitle: true,
        verdict: true,
        submittedAt: true,
        profile: { select: { fullName: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
    prisma.programmingProblem.findMany({
      select: { title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.sqlProblem.findMany({
      select: { title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  type Stamped = RecentActivityItem & { _ts: number };

  const items: Stamped[] = [
    ...sqlSubmissions.map((s) => ({
      icon:
        s.verdict === "Accepted" ? "check_circle"
        : s.verdict === "Wrong Answer" ? "cancel"
        : "error",
      iconBg:
        s.verdict === "Accepted" ? "#E8F5E9"
        : s.verdict === "Wrong Answer" ? "#FFEBEE"
        : "#FFF3E0",
      iconColor:
        s.verdict === "Accepted" ? "#4CAF50"
        : s.verdict === "Wrong Answer" ? "#F44336"
        : "#FF9800",
      title: "SQL Submission",
      subtitle: `${s.profile?.fullName ?? s.profile?.email ?? s.studentEmail} — ${s.problemTitle}`,
      time: timeAgo(s.submittedAt),
      _ts: s.submittedAt.getTime(),
    })),
    ...programmingProblems.map((p) => ({
      icon: "code", iconBg: "#E3F2FD", iconColor: "#2196F3",
      title: "New Programming Problem", subtitle: p.title,
      time: timeAgo(p.createdAt), _ts: p.createdAt.getTime(),
    })),
    ...sqlProblems.map((p) => ({
      icon: "database", iconBg: "#E3F2FD", iconColor: "#2196F3",
      title: "New SQL Problem", subtitle: p.title,
      time: timeAgo(p.createdAt), _ts: p.createdAt.getTime(),
    })),
  ];

  return items
    .sort((a, b) => b._ts - a._ts)
    .slice(0, 5)
    .map(({ _ts, ...item }) => item);
}

// ─── Shared bucketing helpers (pure, no DB) ───────────────────────────────────

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDay(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", day: "numeric" });
}

function bucketTrend(
  range: InsightsRange,
  subs: { submittedAt: Date }[]
): { label: string; value: number }[] {
  const now = new Date();

  if (range === "This Week") {
    const map = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      map.set(toDateKey(d), 0);
    }
    for (const { submittedAt } of subs) {
      const k = toDateKey(submittedAt);
      if (map.has(k)) map.set(k, map.get(k)! + 1);
    }
    return Array.from(map.entries()).map(([k, value]) => {
      const d = new Date(k);
      return { label: fmtDay(new Date(now.getFullYear(), d.getMonth(), d.getDate())), value };
    });
  }

  if (range === "This Month") {
    type Bucket = { label: string; start: Date; end: Date; value: number };
    const buckets: Bucket[] = [];
    for (let i = 0; i < 10; i++) {
      const start = new Date(now); start.setDate(now.getDate() - (10 - i) * 3); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setDate(now.getDate() - (9 - i) * 3); end.setHours(23, 59, 59, 999);
      buckets.push({ label: fmtDay(start), start, end, value: 0 });
    }
    for (const { submittedAt } of subs) {
      for (const b of buckets) {
        if (submittedAt >= b.start && submittedAt <= b.end) { b.value++; break; }
      }
    }
    return buckets.map(({ label, value }) => ({ label, value }));
  }

  // All Time: one bucket per calendar month
  const monthMap = new Map<string, { label: string; value: number }>();
  for (const { submittedAt } of subs) {
    const key = `${submittedAt.getFullYear()}-${String(submittedAt.getMonth() + 1).padStart(2, "0")}`;
    const label = submittedAt.toLocaleString("en-US", { month: "short" });
    if (!monthMap.has(key)) monthMap.set(key, { label, value: 0 });
    monthMap.get(key)!.value++;
  }
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, item]) => item);
}

function bucketSubmissions(
  range: InsightsRange,
  subs: { submittedAt: Date }[]
): { label: string; programming: number; sql: number }[] {
  const now = new Date();

  if (range === "This Week") {
    const map = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      map.set(toDateKey(d), 0);
    }
    for (const { submittedAt } of subs) {
      const k = toDateKey(submittedAt);
      if (map.has(k)) map.set(k, map.get(k)! + 1);
    }
    return Array.from(map.entries()).map(([k, sql]) => {
      const d = new Date(k);
      return { label: fmtDay(new Date(now.getFullYear(), d.getMonth(), d.getDate())), programming: 0, sql };
    });
  }

  if (range === "This Month") {
    type Bucket = { label: string; start: Date; end: Date; sql: number };
    const buckets: Bucket[] = [];
    for (let i = 0; i < 10; i++) {
      const start = new Date(now); start.setDate(now.getDate() - (10 - i) * 3); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setDate(now.getDate() - (9 - i) * 3); end.setHours(23, 59, 59, 999);
      buckets.push({ label: fmtDay(start), start, end, sql: 0 });
    }
    for (const { submittedAt } of subs) {
      for (const b of buckets) {
        if (submittedAt >= b.start && submittedAt <= b.end) { b.sql++; break; }
      }
    }
    return buckets.map(({ label, sql }) => ({ label, programming: 0, sql }));
  }

  // All Time: one bucket per calendar month
  const monthMap = new Map<string, { label: string; sql: number }>();
  for (const { submittedAt } of subs) {
    const key = `${submittedAt.getFullYear()}-${String(submittedAt.getMonth() + 1).padStart(2, "0")}`;
    const label = submittedAt.toLocaleString("en-US", { month: "short" });
    if (!monthMap.has(key)) monthMap.set(key, { label, sql: 0 });
    monthMap.get(key)!.sql++;
  }
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { label, sql }]) => ({ label, programming: 0, sql }));
}

// ─── Student Insights ─────────────────────────────────────────────────────────

export interface StudentInsightStats {
  activeStudents: number;
  activeStudentsDelta: string;
  avgSubmissionsPerStudent: number;
  avgSubmissionsPerStudentDelta: string;
  acceptedSubmissions: number;
  acceptedSubmissionsDelta: string;
  avgAccuracy: number;
  avgAccuracyDelta: string;
}

export interface StudentInsightsForRange {
  stats: StudentInsightStats;
  trend: { label: string; value: number }[];
}

function pctDelta(current: number, prev: number): string {
  if (current === 0 && prev === 0) return "—";
  if (prev === 0) return "+100.0%";
  const d = ((current - prev) / prev) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
}

type PeriodStats = { total: number; accepted: number; activeStudents: number; accuracy: number; avgPerStudent: number };

function computePeriodStats(subs: { studentId: string; verdict: string }[]): PeriodStats {
  const total = subs.length;
  const accepted = subs.filter(s => s.verdict === "Accepted").length;
  const activeStudents = new Set(subs.map(s => s.studentId)).size;
  return {
    total,
    accepted,
    activeStudents,
    accuracy: total > 0 ? Math.round((accepted / total) * 1000) / 10 : 0,
    avgPerStudent: activeStudents > 0 ? Math.round((total / activeStudents) * 10) / 10 : 0,
  };
}

function buildStatsFromPeriods(cur: PeriodStats, prev: PeriodStats | null): StudentInsightStats {
  return {
    activeStudents: cur.activeStudents,
    activeStudentsDelta: prev ? pctDelta(cur.activeStudents, prev.activeStudents) : "—",
    avgSubmissionsPerStudent: cur.avgPerStudent,
    avgSubmissionsPerStudentDelta: prev ? pctDelta(cur.avgPerStudent, prev.avgPerStudent) : "—",
    acceptedSubmissions: cur.accepted,
    acceptedSubmissionsDelta: prev ? pctDelta(cur.accepted, prev.accepted) : "—",
    avgAccuracy: cur.accuracy,
    avgAccuracyDelta: prev ? pctDelta(cur.accuracy, prev.accuracy) : "—",
  };
}

function computeStudentInsights(
  allSubs: { studentId: string; verdict: string; submittedAt: Date }[]
): Record<InsightsRange, StudentInsightsForRange> {
  const now = new Date();
  const weekStart      = new Date(now); weekStart.setDate(now.getDate() - 7);
  const prevWeekStart  = new Date(now); prevWeekStart.setDate(now.getDate() - 14);
  const monthStart     = new Date(now); monthStart.setDate(now.getDate() - 30);
  const prevMonthStart = new Date(now); prevMonthStart.setDate(now.getDate() - 60);

  const weekSubs      = allSubs.filter(s => s.submittedAt >= weekStart);
  const prevWeekSubs  = allSubs.filter(s => s.submittedAt >= prevWeekStart && s.submittedAt < weekStart);
  const monthSubs     = allSubs.filter(s => s.submittedAt >= monthStart);
  const prevMonthSubs = allSubs.filter(s => s.submittedAt >= prevMonthStart && s.submittedAt < monthStart);

  return {
    "This Week": {
      stats: buildStatsFromPeriods(computePeriodStats(weekSubs), computePeriodStats(prevWeekSubs)),
      trend: bucketTrend("This Week", weekSubs.filter(s => s.verdict === "Accepted")),
    },
    "This Month": {
      stats: buildStatsFromPeriods(computePeriodStats(monthSubs), computePeriodStats(prevMonthSubs)),
      trend: bucketTrend("This Month", monthSubs.filter(s => s.verdict === "Accepted")),
    },
    "All Time": {
      stats: buildStatsFromPeriods(computePeriodStats(allSubs), null),
      trend: bucketTrend("All Time", allSubs.filter(s => s.verdict === "Accepted")),
    },
  };
}

// ─── Submissions Overview ─────────────────────────────────────────────────────

function computeSubmissionsOverview(
  allSubs: { submittedAt: Date }[]
): Record<InsightsRange, { label: string; programming: number; sql: number }[]> {
  const now = new Date();
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now); monthStart.setDate(now.getDate() - 30);

  return {
    "This Week":  bucketSubmissions("This Week",  allSubs.filter(s => s.submittedAt >= weekStart)),
    "This Month": bucketSubmissions("This Month", allSubs.filter(s => s.submittedAt >= monthStart)),
    "All Time":   bucketSubmissions("All Time",   allSubs),
  };
}

// ─── Top Performing Students ──────────────────────────────────────────────────

export interface TopStudentEntry {
  email: string;
  problemsSolved: number;
  accuracy: number;
  totalSubmissions: number;
}

function computeTopStudents(
  allSubs: { studentEmail: string; problemId: number; verdict: string; submittedAt: Date }[]
): TopStudentEntry[] {
  type Agg = { total: number; accepted: number; solvedProblems: Set<number>; latestAt: number };
  const map = new Map<string, Agg>();

  for (const sub of allSubs) {
    let agg = map.get(sub.studentEmail);
    if (!agg) {
      agg = { total: 0, accepted: 0, solvedProblems: new Set(), latestAt: 0 };
      map.set(sub.studentEmail, agg);
    }
    agg.total++;
    if (sub.verdict === "Accepted") {
      agg.accepted++;
      agg.solvedProblems.add(sub.problemId);
    }
    const ts = sub.submittedAt.getTime();
    if (ts > agg.latestAt) agg.latestAt = ts;
  }

  type Ranked = TopStudentEntry & { _latestAt: number };

  const rows: Ranked[] = Array.from(map.entries()).map(([email, agg]) => ({
    email,
    problemsSolved: agg.solvedProblems.size,
    accuracy: agg.total > 0 ? Math.round((agg.accepted / agg.total) * 1000) / 10 : 0,
    totalSubmissions: agg.total,
    _latestAt: agg.latestAt,
  }));

  rows.sort(
    (a, b) =>
      b.problemsSolved - a.problemsSolved ||
      b.accuracy - a.accuracy ||
      b._latestAt - a._latestAt
  );

  return rows.slice(0, 10).map(({ _latestAt, ...entry }) => entry);
}

// ─── Combined SQL dashboard data (single DB query) ───────────────────────────

export interface SqlDashboardData {
  studentInsights: Record<InsightsRange, StudentInsightsForRange>;
  submissionsOverview: Record<InsightsRange, { label: string; programming: number; sql: number }[]>;
  topStudents: TopStudentEntry[];
}

export async function getSqlDashboardData(): Promise<SqlDashboardData> {
  // Restrict to student submissions only — admin test submissions must never
  // affect student analytics, leaderboards, or insights.
  const allSubs = await prisma.sqlSubmission.findMany({
    where: { profile: { role: "student" } },
    select: {
      studentId: true,
      studentEmail: true,
      problemId: true,
      verdict: true,
      submittedAt: true,
    },
  });

  return {
    studentInsights: computeStudentInsights(allSubs),
    submissionsOverview: computeSubmissionsOverview(allSubs),
    topStudents: computeTopStudents(allSubs),
  };
}
