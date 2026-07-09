"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import clsx from "clsx";
import type { InsightsRange, RecentActivityItem } from "@/lib/types";
import type { getSqlDashboardData } from "@/lib/actions/admin-dashboard";
import { Card } from "@/components/ui/Card";

type SqlData = Awaited<ReturnType<typeof getSqlDashboardData>>;
type StudentInsightsByRange = SqlData["studentInsights"];
type SubmissionsOverview = SqlData["submissionsOverview"];

const INSIGHTS_RANGES: InsightsRange[] = ["This Week", "This Month", "All Time"];

interface Props {
  recentActivity: RecentActivityItem[];
  studentInsights: StudentInsightsByRange;
  submissionsOverview: SubmissionsOverview;
}

export function DashboardInteractiveSection({ recentActivity, studentInsights, submissionsOverview }: Props) {
  const [insightsRange, setInsightsRange] = useState<InsightsRange>("This Month");
  const insights = studentInsights[insightsRange].stats;
  const trend = studentInsights[insightsRange].trend;

  const [submissionsRange, setSubmissionsRange] = useState<InsightsRange>("This Month");
  const submissionsData = submissionsOverview[submissionsRange];

  return (
    <>
      {/* Student Insights */}
      <Card className="p-card-padding">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">Student Insights</h2>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">info</span>
          </div>
          <select
            value={insightsRange}
            onChange={(e) => setInsightsRange(e.target.value as InsightsRange)}
            className="border border-outline-variant/40 rounded-lg text-sm py-1.5 px-3 bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
          >
            {INSIGHTS_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "SQL Active Students", value: insights.activeStudents, delta: insights.activeStudentsDelta },
            { label: "Avg SQL / Student", value: insights.avgSubmissionsPerStudent, delta: insights.avgSubmissionsPerStudentDelta },
            { label: "SQL Accepted", value: insights.acceptedSubmissions.toLocaleString(), delta: insights.acceptedSubmissionsDelta },
            { label: "SQL Accuracy", value: `${insights.avgAccuracy}%`, delta: insights.avgAccuracyDelta },
          ].map((b) => (
            <div key={b.label} className="bg-surface-container-low/60 rounded-xl p-4">
              <p className="font-body-md text-body-md text-on-surface-variant mb-1">{b.label}</p>
              <p className="font-headline-lg text-headline-lg text-on-surface">{b.value}</p>
              <p className={clsx(
                "font-label-sm text-label-sm font-semibold mt-1",
                b.delta === "—" ? "text-on-surface-variant" : b.delta.startsWith("-") ? "text-red-500" : "text-emerald-600"
              )}>
                {b.delta === "—" ? "—" : `${b.delta.startsWith("-") ? "↓" : "↑"} ${b.delta}`}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <h3 className="font-label-md text-label-md font-bold text-on-surface mb-2">Problems Solved Trend</h3>
          <div className="h-[220px]">
            {trend.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="font-body-md text-body-md text-on-surface-variant">No submission data yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#74777d" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#74777d" }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#0a1d30" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </Card>

      {/* Submissions Overview + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <Card className="p-card-padding">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline-md text-headline-md text-on-surface">Submissions Overview</h2>
            <select
              value={submissionsRange}
              onChange={(e) => setSubmissionsRange(e.target.value as InsightsRange)}
              className="border border-outline-variant/40 rounded-lg text-sm py-1.5 px-3 bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
            >
              {INSIGHTS_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="h-[260px]">
            {submissionsData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="font-body-md text-body-md text-on-surface-variant">No submission data yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={submissionsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#74777d" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#74777d" }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="programming" stackId="a" fill="#0a1d30" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="sql" stackId="a" fill="#c4c6cd" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex items-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#0a1d30]" />
              <span className="font-label-sm text-label-sm text-on-surface-variant">Programming Submissions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#c4c6cd]" />
              <span className="font-label-sm text-label-sm text-on-surface-variant">SQL Submissions</span>
            </div>
          </div>
        </Card>

        <Card className="p-card-padding">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant text-center py-4">No recent activity yet.</p>
            )}
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: a.iconBg }}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ color: a.iconColor }}>
                    {a.icon}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-body-md text-body-md font-medium text-on-surface">{a.title}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{a.subtitle}</p>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
          <Link
            href="/admin/submissions"
            className="inline-flex items-center gap-1 font-label-md text-label-md text-secondary mt-4"
          >
            View All Activity
          </Link>
        </Card>
      </div>
    </>
  );
}
