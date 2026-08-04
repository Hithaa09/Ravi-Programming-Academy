import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentById, getStudentStats } from "@/lib/actions/admin-students";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { StudentDetailClient } from "./StudentDetailClient";

function initialsFrom(fullName: string | null, email: string): string {
  const src = fullName ?? email;
  const parts = src.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function StatusPill({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${active ? "bg-status-solved-bg text-status-solved-text" : "bg-status-wrong-bg text-status-wrong-text"}`}>
      {status}
    </span>
  );
}

function formatAmount(amountPaise: number | null, currency: string): string {
  if (amountPaise === null) return "—";
  const major = amountPaise / 100;
  return currency === "INR" ? `₹${major.toLocaleString("en-IN")}` : `${major.toLocaleString()} ${currency}`;
}

function ProviderPill({ provider }: { provider: string }) {
  const isRazorpay = provider === "razorpay";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-medium ${
        isRazorpay ? "bg-status-solved-bg text-status-solved-text" : "bg-surface-container-low text-on-surface-variant"
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">{isRazorpay ? "credit_card" : "person"}</span>
      {isRazorpay ? "Razorpay" : "Manual"}
    </span>
  );
}

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const [student, stats] = await Promise.all([
    getStudentById(params.id),
    getStudentStats(params.id),
  ]);

  if (!student) notFound();

  const initials = initialsFrom(student.fullName, student.email);
  const joinedOn = student.createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

  return (
    <div className="max-w-container-max mx-auto space-y-6">
      <Link href="/admin/students" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors font-label-md font-medium">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Students
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary-fixed-dim/30 flex items-center justify-center font-headline-lg text-headline-lg text-secondary font-bold">
            {initials}
          </div>
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface">{student.fullName ?? student.email}</h1>
            <p className="font-label-md text-label-md text-secondary">{student.email}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5 mt-1">
              <span className="material-symbols-outlined text-[14px]">event</span> Joined on {joinedOn}
            </p>
          </div>
        </div>
        <StudentDetailClient student={student} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard value={stats.programmingProblemsSolved} label="Programming Solved" icon="code" />
        <StatCard value={stats.programmingSubmissionsCount} label="Programming Submissions" icon="description" />
        <StatCard value={`${stats.programmingAccuracy}%`} label="Programming Accuracy" icon="emoji_events" />
        <StatCard value={stats.sqlProblemsSolved} label="SQL Problems Solved" icon="database" />
        <StatCard value={stats.totalSubmissions} label="SQL Submissions" icon="description" />
        <StatCard value={`${stats.sqlAccuracy}%`} label="SQL Accuracy" icon="emoji_events" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-card-padding">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Student Information</h2>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Full Name</p>
              <p className="text-on-surface font-medium mt-0.5">{student.fullName ?? "—"}</p>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Email</p>
              <p className="text-on-surface font-medium mt-0.5">{student.email}</p>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Role</p>
              <p className="text-on-surface font-medium mt-0.5 capitalize">{student.role}</p>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Status</p>
              <div className="mt-0.5"><StatusPill status={student.status} /></div>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Joined Date</p>
              <p className="text-on-surface font-medium mt-0.5">{joinedOn}</p>
            </div>
          </div>
        </Card>

        <Card className="p-card-padding">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Performance Summary</h2>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Problems Solved</p>
              <p className="text-on-surface font-headline-md text-headline-md mt-0.5">{stats.sqlProblemsSolved}</p>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Total Submissions</p>
              <p className="text-on-surface font-headline-md text-headline-md mt-0.5">{stats.totalSubmissions}</p>
            </div>
            <div>
              <p className="text-on-surface-variant font-label-sm text-label-sm">Accuracy</p>
              <p className="text-on-surface font-headline-md text-headline-md mt-0.5">{stats.sqlAccuracy}%</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant/10">
            <p className="text-on-surface-variant font-label-sm text-label-sm">Programming Statistics</p>
            <div className="grid grid-cols-2 gap-y-2 mt-2 text-sm">
              <div>
                <p className="text-on-surface-variant font-label-sm text-label-sm">Problems Solved</p>
                <p className="text-on-surface font-medium mt-0.5">{stats.programmingProblemsSolved}</p>
              </div>
              <div>
                <p className="text-on-surface-variant font-label-sm text-label-sm">Accuracy</p>
                <p className="text-on-surface font-medium mt-0.5">{stats.programmingAccuracy}%</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-card-padding lg:col-span-2">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Purchase Details</h2>
          {student.purchases.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No purchase yet — this student does not have lifetime access via a payment.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-y-4 gap-x-4 text-sm">
              <div>
                <p className="text-on-surface-variant font-label-sm text-label-sm">Purchased On</p>
                <p className="text-on-surface font-medium mt-0.5">
                  {student.purchases[0].createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
              <div>
                <p className="text-on-surface-variant font-label-sm text-label-sm">Provider</p>
                <div className="mt-0.5"><ProviderPill provider={student.purchases[0].provider} /></div>
              </div>
              <div>
                <p className="text-on-surface-variant font-label-sm text-label-sm">Receipt / Payment ID</p>
                <p className="text-on-surface font-medium mt-0.5 font-mono text-xs">{student.purchases[0].providerReference ?? "—"}</p>
              </div>
              <div>
                <p className="text-on-surface-variant font-label-sm text-label-sm">Amount</p>
                <p className="text-on-surface font-medium mt-0.5">{formatAmount(student.purchases[0].amount, student.purchases[0].currency)}</p>
              </div>
              <div>
                <p className="text-on-surface-variant font-label-sm text-label-sm">Status</p>
                <p className="text-on-surface font-medium mt-0.5 capitalize">{student.purchases[0].status}</p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-card-padding lg:col-span-2">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Recent Submissions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                <tr>
                  <th className="py-2">Problem</th>
                  <th className="py-2">Language</th>
                  <th className="py-2">Verdict</th>
                  <th className="py-2">Time</th>
                  <th className="py-2">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-sm">
                {stats.recentSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-on-surface-variant">No submissions yet.</td>
                  </tr>
                ) : stats.recentSubmissions.map((s) => (
                  <tr key={`${s.type}-${s.id}`}>
                    <td className="py-3 font-medium text-on-surface">{s.problemTitle}</td>
                    <td className="py-3 text-on-surface-variant">{s.language}</td>
                    <td className="py-3">
                      <span className={`text-xs font-semibold ${s.verdict === "Accepted" ? "text-emerald-600" : "text-rose-600"}`}>
                        {s.verdict}
                      </span>
                    </td>
                    <td className="py-3 text-on-surface-variant">{s.executionTimeMs}ms</td>
                    <td className="py-3 text-on-surface-variant">
                      {s.submittedAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
