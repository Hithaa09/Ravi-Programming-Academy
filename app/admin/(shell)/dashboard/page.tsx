import Link from "next/link";
import { getAdminDashboardStats, getRecentActivity, getSqlDashboardData } from "@/lib/actions/admin-dashboard";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { DashboardInteractiveSection } from "./DashboardInteractiveSection";

export default async function AdminDashboardPage() {
  const [stats, recentActivity, sqlData] = await Promise.all([
    getAdminDashboardStats(),
    getRecentActivity(),
    getSqlDashboardData(),
  ]);
  const { studentInsights, submissionsOverview, topStudents } = sqlData;

  return (
    <div className="max-w-container-max mx-auto space-y-6">
      <div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Dashboard</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">Overview of your academy</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard value={stats.sqlActiveStudents} label="SQL Active Students" icon="group" />
        <StatCard value={stats.totalProgrammingProblems} label="Programming Problems" icon="code" />
        <StatCard value={stats.totalSqlProblems} label="SQL Problems" icon="database" />
        <StatCard value={stats.totalSqlSubmissions.toLocaleString()} label="SQL Submissions" icon="description" />
      </div>

      <DashboardInteractiveSection recentActivity={recentActivity} studentInsights={studentInsights} submissionsOverview={submissionsOverview} />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <Card className="p-card-padding">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline-md text-headline-md text-on-surface">Top Performing Students</h2>
            <select className="border border-outline-variant/40 rounded-lg text-sm py-1.5 px-3 bg-white focus:outline-none focus:ring-1 focus:ring-secondary">
              <option>This Month</option>
            </select>
          </div>
          <table className="w-full text-left border-collapse">
            <thead className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              <tr>
                <th className="py-2">Rank</th>
                <th className="py-2">Student Name</th>
                <th className="py-2">Problems Solved</th>
                <th className="py-2">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {topStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center font-body-md text-body-md text-on-surface-variant">
                    No SQL submissions yet.
                  </td>
                </tr>
              ) : topStudents.map((s, i) => (
                <tr key={s.email}>
                  <td className="py-3 font-medium text-on-surface">{i + 1}</td>
                  <td className="py-3 text-on-surface">{s.email}</td>
                  <td className="py-3 text-on-surface-variant">{s.problemsSolved}</td>
                  <td className="py-3 text-on-surface-variant">{s.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link href="/admin/students" className="inline-flex items-center gap-1 font-label-md text-label-md text-secondary mt-4">
            View All Students
          </Link>
        </Card>

        <Card className="p-card-padding">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/admin/programming-problems/add"
              className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface">add</span>
              <span className="font-label-md text-label-md text-on-surface">Add Programming Problem</span>
            </Link>
            <Link
              href="/admin/sql-problems/add"
              className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface">add</span>
              <span className="font-label-md text-label-md text-on-surface">Add SQL Problem</span>
            </Link>
            <Link
              href="/admin/programming-problems/bulk-upload"
              className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface">add</span>
              <span className="font-label-md text-label-md text-on-surface">Add Problem Bundle (Bulk Upload)</span>
            </Link>
            <Link
              href="/admin/students"
              className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface">group</span>
              <span className="font-label-md text-label-md text-on-surface">View Students</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
