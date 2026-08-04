"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import type { SubmissionStatus } from "@/lib/types";

const PAGE_SIZE = 10;
type VerdictFilter = "All Verdicts" | SubmissionStatus;
const VERDICT_OPTIONS: VerdictFilter[] = [
  "All Verdicts",
  "Accepted",
  "Wrong Answer",
  "Compilation Error",
  "Runtime Error",
  "Time Limit Exceeded",
  "Memory Limit Exceeded",
  "Error",
];

interface Stats {
  total: number;
  accepted: number;
  acceptedPct: number;
  wrongAnswer: number;
  wrongAnswerPct: number;
  errors: number;
  errorsPct: number;
}

export interface UnifiedAdminSubmission {
  id: number;
  type: "sql" | "programming";
  language: string;
  studentEmail: string;
  problemTitle: string;
  verdict: string;
  executionTimeMs: number;
  passed: number;
  total: number;
  submittedAt: Date;
}

interface Props {
  submissions: UnifiedAdminSubmission[];
  stats: Stats;
}

export function AdminSubmissionsTable({ submissions, stats }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [verdict, setVerdict] = useState<VerdictFilter>("All Verdicts");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (verdict !== "All Verdicts" && s.verdict !== verdict) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.problemTitle.toLowerCase().includes(q) &&
          !s.studentEmail.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [submissions, search, verdict]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function detailHref(s: UnifiedAdminSubmission): string {
    return s.type === "sql" ? `/admin/submissions/${s.id}` : `/admin/submissions/programming/${s.id}`;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/20 p-6">
          <p className="font-headline-lg text-headline-lg text-on-surface">{stats.total.toLocaleString()}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Total Submissions</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/20 p-6">
          <p className="font-headline-lg text-headline-lg text-on-surface">{stats.accepted} ({stats.acceptedPct}%)</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Accepted</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/20 p-6">
          <p className="font-headline-lg text-headline-lg text-on-surface">{stats.wrongAnswer} ({stats.wrongAnswerPct}%)</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Wrong Answer</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/20 p-6">
          <p className="font-headline-lg text-headline-lg text-on-surface">{stats.errors} ({stats.errorsPct}%)</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Errors</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput
          placeholder="Search by problem or student..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <select
          value={verdict}
          onChange={(e) => { setVerdict(e.target.value as VerdictFilter); setPage(1); }}
          className="border border-outline-variant/40 rounded-lg text-sm py-2 px-4 bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
        >
          {VERDICT_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low/50 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Problem</th>
                <th className="px-6 py-4">Language</th>
                <th className="px-6 py-4">Verdict</th>
                <th className="px-6 py-4">Test Cases</th>
                <th className="px-6 py-4">Exec Time</th>
                <th className="px-6 py-4">Submitted On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {pageItems.map((s, i) => (
                <tr
                  key={`${s.type}-${s.id}`}
                  className="hover:bg-surface-container-low/40 transition-colors cursor-pointer"
                  onClick={() => router.push(detailHref(s))}
                >
                  <td className="px-6 py-4 text-on-surface-variant">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-6 py-4 font-medium text-on-surface">{s.studentEmail}</td>
                  <td className="px-6 py-4 text-on-surface">{s.problemTitle}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{s.language}</td>
                  <td className="px-6 py-4"><StatusBadge status={s.verdict as SubmissionStatus} /></td>
                  <td className="px-6 py-4 text-on-surface-variant">{s.passed} / {s.total}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{s.executionTimeMs} ms</td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {new Date(s.submittedAt).toLocaleString("en-US", {
                      month: "short", day: "2-digit", year: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-on-surface-variant">
                    {submissions.length === 0 ? "No submissions yet." : "No submissions match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-2">
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} itemLabel="submissions" />
        </div>
      </div>
    </>
  );
}
