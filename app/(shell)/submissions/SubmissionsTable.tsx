"use client";

import { useMemo, useState } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge, DifficultyLabel } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import type { SubmissionStatus } from "@/lib/types";

const PAGE_SIZE = 10;
type VerdictFilter = "All Status" | SubmissionStatus;
const STATUS_OPTIONS: VerdictFilter[] = [
  "All Status",
  "Accepted",
  "Wrong Answer",
  "Compilation Error",
  "Runtime Error",
  "Time Limit Exceeded",
  "Memory Limit Exceeded",
  "Error",
];

export interface UnifiedSubmission {
  key: string;
  language: string;
  problemTitle: string;
  problemDifficulty: string;
  verdict: string;
  executionTimeMs: number;
  passed: number;
  total: number;
  submittedAt: Date;
}

interface Props {
  submissions: UnifiedSubmission[];
}

export function SubmissionsTable({ submissions }: Props) {
  const [search, setSearch] = useState("");
  const [verdict, setVerdict] = useState<VerdictFilter>("All Status");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (verdict !== "All Status" && s.verdict !== verdict) return false;
      if (search && !s.problemTitle.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [submissions, search, verdict]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/20 overflow-hidden">
      <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between gap-4 flex-wrap">
        <SearchInput
          placeholder="Search submissions..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          value={verdict}
          onChange={(e) => { setVerdict(e.target.value as VerdictFilter); setPage(1); }}
          className="border border-outline-variant/40 rounded-lg text-sm py-2 px-4 focus:outline-none focus:ring-1 focus:ring-secondary bg-white"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low/50 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Problem</th>
              <th className="px-6 py-4">Language</th>
              <th className="px-6 py-4">Difficulty</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Test Cases</th>
              <th className="px-6 py-4">Exec Time</th>
              <th className="px-6 py-4">Submitted On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10 text-sm">
            {pageItems.map((s) => (
              <tr key={s.key} className="hover:bg-surface-container-low/40 transition-colors">
                <td className="px-6 py-4 font-bold text-on-surface">{s.problemTitle}</td>
                <td className="px-6 py-4 text-on-surface-variant">{s.language}</td>
                <td className="px-6 py-4">
                  {s.problemDifficulty
                    ? <DifficultyLabel difficulty={s.problemDifficulty as "Easy" | "Medium" | "Hard"} />
                    : <span className="text-on-surface-variant">—</span>}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={s.verdict as SubmissionStatus} />
                </td>
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
                <td colSpan={7} className="px-6 py-10 text-center text-on-surface-variant">
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
  );
}
