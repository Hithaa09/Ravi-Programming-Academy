import Link from "next/link";
import { getStudentDashboardData } from "@/lib/actions/student-dashboard";
import { getSqlLeaderboardAllRanges } from "@/lib/actions/leaderboard";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Card } from "@/components/ui/Card";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { StatusBadge } from "@/components/ui/Badge";
import type { SubmissionStatus } from "@/lib/types";

const PROGRAMMING_COLORS: Record<string, string> = { Easy: "#4CAF50", Medium: "#FF9800", Hard: "#F44336" };
const RANK_BG: Record<number, string> = { 1: "#FF9800", 2: "#9E9E9E", 3: "#FF7043" };

// Weekly Activity heatmap presentation only — bucketing a raw submission
// count into a 0-4 shading level is a UI concern, not a data-layer one, so
// it lives here rather than in getStudentDashboardData().
function countToLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
}

function monthLabelAt(days: { date: string }[], fraction: number): string {
  const idx = Math.min(days.length - 1, Math.floor(fraction * (days.length - 1)));
  return new Date(days[idx].date).toLocaleString("en-US", { month: "short" });
}

// Same initials convention already used in LeaderboardTable.tsx / AdminLeaderboardTable.tsx.
function initialsFor(fullName: string | null, email: string): string {
  const source = fullName?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((w) => w[0]?.toUpperCase()).join("");
  return initials || "?";
}

// Same relative-time convention already used in admin-dashboard.ts's timeAgo().
function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default async function DashboardPage() {
  const [dashboardData, leaderboardByRange] = await Promise.all([
    getStudentDashboardData(),
    getSqlLeaderboardAllRanges(),
  ]);
  const topLearners = leaderboardByRange["All Time"].slice(0, 5);

  // Hours Practiced removed for V1 — no real session/activity tracking
  // exists yet, and the old value was mock data. Revisit once that lands.
  const stats = [
    { value: dashboardData.programmingProblemsSolved, label: "Programming Problems Solved", icon: "code" },
    { value: dashboardData.programmingAttempts, label: "Programming Attempts", icon: "description" },
    { value: `${dashboardData.programmingAccuracy}%`, label: "Programming Accuracy", icon: "trending_up" },
    { value: dashboardData.sqlProblemsSolved, label: "SQL Problems Solved", icon: "check_box" },
    { value: dashboardData.sqlAttempts, label: "SQL Attempts", icon: "description" },
    { value: `${dashboardData.sqlAccuracy}%`, label: "SQL Accuracy", icon: "trending_up" },
  ];

  // Chunk the flat 91-day list into 13 columns of 7 (oldest to newest),
  // matching the exact same column/row rendering the heatmap already used.
  const weeklyColumns: { date: string; count: number }[][] = [];
  for (let i = 0; i < dashboardData.weeklyActivity.length; i += 7) {
    weeklyColumns.push(dashboardData.weeklyActivity.slice(i, i + 7));
  }

  return (
    <div className="max-w-container-max mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Hello, {dashboardData.fullName ?? dashboardData.email}</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Keep solving problems and improve every day!</p>
        </div>
        <StreakBadge days={dashboardData.currentStreak} subtitle="Day Streak" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s) => (
          <StatCard key={s.label} value={s.value} label={s.label} icon={s.icon} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-card-padding">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">code</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Programming Progress</h3>
          </div>
          <div className="space-y-6">
            {Object.entries(dashboardData.programmingProgressByDifficulty).map(([label, v]) => (
              <ProgressBar key={label} label={label} solved={v.solved} total={v.total} color={PROGRAMMING_COLORS[label]} />
            ))}
          </div>
          <div className="mt-8">
            <Link href="/problems" className="inline-flex items-center gap-2 font-label-md text-label-md text-[#4CAF50] hover:text-[#388E3C] transition-colors">
              View All Problems
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </Card>

        <Card className="p-card-padding">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">database</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">SQL Progress</h3>
          </div>
          <div className="space-y-6">
            {Object.entries(dashboardData.sqlProgressByDifficulty).map(([label, v]) => (
              <ProgressBar key={label} label={label} solved={v.solved} total={v.total} color={PROGRAMMING_COLORS[label]} />
            ))}
          </div>
          <div className="mt-8">
            <Link href="/sql" className="inline-flex items-center gap-2 font-label-md text-label-md text-[#2196F3] hover:text-[#1976D2] transition-colors">
              View All Topics
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <Card className="p-card-padding flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">calendar_month</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Weekly Activity</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center py-4">
            <div className="w-full overflow-x-auto pb-4">
              <div className="min-w-[600px] flex justify-between text-on-surface-variant font-label-sm text-label-sm mb-2 px-8">
                <span>{monthLabelAt(dashboardData.weeklyActivity, 0)}</span>
                <span>{monthLabelAt(dashboardData.weeklyActivity, 0.5)}</span>
                <span>{monthLabelAt(dashboardData.weeklyActivity, 1)}</span>
              </div>
              <div className="flex gap-1 min-w-[600px]">
                {weeklyColumns.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-1">
                    {col.map((day, ri) => (
                      <div key={ri} className="heatmap-cell" data-level={countToLevel(day.count)} title={`${day.date}: ${day.count} submission${day.count === 1 ? "" : "s"}`} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-on-surface-variant font-label-sm text-label-sm">
              <span>Less</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((l) => <div key={l} className="heatmap-cell" data-level={l} />)}
              </div>
              <span>More</span>
            </div>
          </div>
        </Card>

        <Card className="p-card-padding">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">emoji_events</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Top Learners</h3>
          </div>
          {topLearners.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant text-center py-6">No leaderboard data yet.</p>
          ) : (
            <div className="space-y-4">
              {topLearners.map((l) => {
                const isCurrentUser = l.profileId === dashboardData.profileId;
                return (
                  <div key={l.profileId} className={`flex items-center gap-4 ${isCurrentUser ? "bg-surface rounded-lg -mx-2 px-2 py-1 border border-outline-variant/30" : ""}`}>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold text-white"
                      style={{ backgroundColor: RANK_BG[l.rank] ?? "#cbd5e1" }}
                    >
                      {l.rank}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed-dim/30 flex items-center justify-center font-label-sm text-label-sm text-secondary font-bold">
                      {initialsFor(l.fullName, l.email)}
                    </div>
                    <span className="font-body-md text-body-md font-medium text-on-surface flex-1">{l.fullName ?? l.email}</span>
                    <span className="font-label-md text-label-md text-on-surface-variant">{l.totalProblemsSolved}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-6">
            <Link href="/leaderboard" className="inline-flex items-center gap-2 font-label-md text-label-md text-secondary hover:text-secondary-container transition-colors">
              View Leaderboard
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-card-padding">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-on-surface-variant text-[22px]">description</span>
          <h3 className="font-headline-md text-headline-md text-on-surface">Recent Submissions</h3>
        </div>
        {dashboardData.recentSubmissions.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant text-center py-6">No submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                <tr>
                  <th className="py-2 pr-4">Problem</th>
                  <th className="py-2 pr-4">Language</th>
                  <th className="py-2 pr-4">Verdict</th>
                  <th className="py-2 pr-4">Submitted</th>
                  <th className="py-2">Exec Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-sm">
                {dashboardData.recentSubmissions.map((s) => (
                  <tr key={`${s.type}-${s.id}`}>
                    <td className="py-3 pr-4 font-medium text-on-surface">{s.problemTitle}</td>
                    <td className="py-3 pr-4 text-on-surface-variant">{s.language}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={s.verdict as SubmissionStatus} />
                    </td>
                    <td className="py-3 pr-4 text-on-surface-variant" title={s.submittedAt.toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" })}>
                      {timeAgo(s.submittedAt)}
                    </td>
                    <td className="py-3 text-on-surface-variant">{s.executionTimeMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
