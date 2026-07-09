import Link from "next/link";
import { CURRENT_USER, LEADERBOARD, WEEKLY_ACTIVITY } from "@/lib/mock-data";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Card } from "@/components/ui/Card";
import { StreakBadge } from "@/components/ui/StreakBadge";

const STAT_DEFS = [
  { key: "totalSolved", deltaKey: "totalSolvedDelta", label: "Total Problems Solved", icon: "check_box" },
  { key: "totalAttempts", deltaKey: "totalAttemptsDelta", label: "Total Attempts", icon: "description" },
  { key: "successRate", deltaKey: "successRateDelta", label: "Success Rate", icon: "trending_up", suffix: "%" },
  { key: "hoursPracticed", deltaKey: "hoursPracticedDelta", label: "Hours Practiced", icon: "timer" },
] as const;

const PROGRAMMING_COLORS: Record<string, string> = { Easy: "#4CAF50", Medium: "#FF9800", Hard: "#F44336" };
const RANK_BG: Record<number, string> = { 1: "#FF9800", 2: "#9E9E9E", 3: "#FF7043" };

export default function DashboardPage() {
  const topLearners = LEADERBOARD.slice(0, 5);

  return (
    <div className="max-w-container-max mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Hello, {CURRENT_USER.name}</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Keep solving problems and improve every day!</p>
        </div>
        <StreakBadge days={CURRENT_USER.streakDays} subtitle="Day Streak" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STAT_DEFS.map((s) => (
          <StatCard
            key={s.key}
            value={`${CURRENT_USER.stats[s.key]}${"suffix" in s ? s.suffix : ""}`}
            label={s.label}
            delta={CURRENT_USER.stats[s.deltaKey]}
            icon={s.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-card-padding">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">code</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Programming Progress</h3>
          </div>
          <div className="space-y-6">
            {Object.entries(CURRENT_USER.programmingProgress).map(([label, v]) => (
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
            {Object.entries(CURRENT_USER.sqlProgress).map(([label, v]) => (
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
                <span>Mar</span><span>Apr</span><span>May</span>
              </div>
              <div className="flex gap-1 min-w-[600px]">
                {WEEKLY_ACTIVITY.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-1">
                    {col.map((level, ri) => (
                      <div key={ri} className="heatmap-cell" data-level={level} />
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
          <div className="space-y-4">
            {topLearners.map((l) => (
              <div key={l.rank} className={`flex items-center gap-4 ${l.isCurrentUser ? "bg-surface rounded-lg -mx-2 px-2 py-1 border border-outline-variant/30" : ""}`}>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold text-white"
                  style={{ backgroundColor: RANK_BG[l.rank] ?? "#cbd5e1" }}
                >
                  {l.rank}
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary-fixed-dim/30 flex items-center justify-center font-label-sm text-label-sm text-secondary font-bold">
                  {l.initials}
                </div>
                <span className="font-body-md text-body-md font-medium text-on-surface flex-1">{l.name}</span>
                <span className="font-label-md text-label-md text-on-surface-variant">{l.totalPoints}</span>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/leaderboard" className="inline-flex items-center gap-2 font-label-md text-label-md text-secondary hover:text-secondary-container transition-colors">
              View Leaderboard
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
