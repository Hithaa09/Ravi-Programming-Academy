"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Pagination } from "@/components/ui/Pagination";
import type { SqlLeaderboardEntry } from "@/lib/actions/leaderboard";
import type { InsightsRange } from "@/lib/types";

const PAGE_SIZE = 10;
const RANGES: InsightsRange[] = ["This Week", "This Month", "All Time"];
const RANK_BG: Record<number, string> = { 1: "bg-tertiary-fixed text-on-tertiary-fixed", 2: "bg-surface-variant text-on-surface-variant", 3: "bg-error-container/80 text-on-error-container" };

function initialsFor(fullName: string | null, email: string): string {
  const source = fullName?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((w) => w[0]?.toUpperCase()).join("");
  return initials || "?";
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  data: Record<InsightsRange, SqlLeaderboardEntry[]>;
  totalStudents: number;
}

export function AdminLeaderboardTable({ data, totalStudents }: Props) {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<InsightsRange>("All Time");
  const leaderboard = data[range];
  const pageItems = leaderboard.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const sqlSolvedTotal = leaderboard.reduce((sum, e) => sum + e.sqlProblemsSolved, 0);
    const programmingSolvedTotal = leaderboard.reduce((sum, e) => sum + e.programmingProblemsSolved, 0);
    const totalSqlSubmissions = leaderboard.reduce((sum, e) => sum + e.totalSqlSubmissions, 0);
    const averageSqlAccuracy = leaderboard.length > 0
      ? Math.round((leaderboard.reduce((sum, e) => sum + e.sqlAccuracy, 0) / leaderboard.length) * 10) / 10
      : 0;
    return { sqlSolvedTotal, programmingSolvedTotal, totalSqlSubmissions, averageSqlAccuracy };
  }, [leaderboard]);

  function handleRangeChange(next: InsightsRange) {
    setRange(next);
    setPage(1);
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard value={totalStudents} label="Total Students" delta="Registered" icon="emoji_events" />
        <StatCard value={stats.programmingSolvedTotal.toLocaleString()} label="Programming Solved" delta={range} icon="code" />
        <StatCard value={stats.sqlSolvedTotal.toLocaleString()} label="SQL Solved" delta={range} icon="database" />
        <StatCard value={stats.totalSqlSubmissions.toLocaleString()} label="Total SQL Submissions" delta={range} icon="description" />
        <StatCard value={`${stats.averageSqlAccuracy}%`} label="Average SQL Accuracy" delta={range} icon="trending_up" />
      </div>

      <div className="flex items-center justify-end gap-3">
        <select
          value={range}
          onChange={(e) => handleRangeChange(e.target.value as InsightsRange)}
          className="border border-outline-variant/40 rounded-lg text-sm py-2 px-4 bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
        >
          {RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden border border-outline-variant/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-bright text-xs font-semibold text-on-surface-variant uppercase tracking-wider border-b border-surface-variant/50">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4 text-right">Programming Solved</th>
                <th className="px-6 py-4 text-right">SQL Solved</th>
                <th className="px-6 py-4 text-right">SQL Accuracy</th>
                <th className="px-6 py-4 text-right">Total SQL Submissions</th>
                <th className="px-6 py-4 text-right">First Accepted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center font-body-md text-body-md text-on-surface-variant">
                    No submissions yet for this period.
                  </td>
                </tr>
              ) : pageItems.map((l) => (
                <tr key={l.profileId} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-6 py-4 font-medium text-on-surface">
                    {l.rank <= 3 ? (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md font-bold shadow-sm ${RANK_BG[l.rank]}`}>{l.rank}</div>
                    ) : (
                      l.rank
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/students/${l.profileId}`} className="flex items-center gap-3 hover:underline">
                      <div className="w-8 h-8 rounded-full bg-secondary-fixed-dim/30 flex items-center justify-center font-label-md text-label-md text-secondary font-bold">
                        {initialsFor(l.fullName, l.email)}
                      </div>
                      <div>
                        <p className="font-medium text-on-surface">{l.fullName ?? "—"}</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{l.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right text-on-surface-variant">{l.programmingProblemsSolved}</td>
                  <td className="px-6 py-4 text-right text-on-surface-variant">{l.sqlProblemsSolved}</td>
                  <td className="px-6 py-4 text-right text-on-surface-variant">{l.sqlAccuracy}%</td>
                  <td className="px-6 py-4 text-right text-on-surface-variant">{l.totalSqlSubmissions}</td>
                  <td className="px-6 py-4 text-right text-on-surface-variant">{formatDate(l.firstAcceptedSubmission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-2">
          <Pagination page={page} pageSize={PAGE_SIZE} total={leaderboard.length} onPageChange={setPage} itemLabel="students" />
        </div>
      </div>
    </>
  );
}
