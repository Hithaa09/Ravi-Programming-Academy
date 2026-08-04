"use client";

import { useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import type { SqlLeaderboardEntry } from "@/lib/actions/leaderboard";
import type { InsightsRange } from "@/lib/types";

const PAGE_SIZE = 10;
const TABS: InsightsRange[] = ["This Week", "This Month", "All Time"];

const RANK_BG: Record<number, string> = { 1: "bg-tertiary-fixed text-on-tertiary-fixed", 2: "bg-surface-variant text-on-surface-variant", 3: "bg-error-container/80 text-on-error-container" };

function initialsFor(fullName: string | null, email: string): string {
  const source = fullName?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((w) => w[0]?.toUpperCase()).join("");
  return initials || "?";
}

interface Props {
  data: Record<InsightsRange, SqlLeaderboardEntry[]>;
  currentUserId: string | null;
}

export function LeaderboardTable({ data, currentUserId }: Props) {
  const [tab, setTab] = useState<InsightsRange>("All Time");
  const [page, setPage] = useState(1);
  const entries = data[tab];
  const pageItems = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleTabChange(next: InsightsRange) {
    setTab(next);
    setPage(1);
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Leaderboard</h1>
        <div className="flex p-1 bg-surface-container-highest/30 rounded-lg border border-outline-variant/30">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`px-4 py-1.5 rounded-md font-label-md text-label-md transition-all ${tab === t ? "bg-primary-container text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden border border-outline-variant/20">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface-bright border-b border-surface-variant/50 items-center">
              <div className="col-span-2 font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider">Rank</div>
              <div className="col-span-4 font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider">User</div>
              <div className="col-span-2 font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider text-right">Problems Solved</div>
              <div className="col-span-2 font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider text-right">Accuracy</div>
              <div className="col-span-2 font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider text-right">Submission Count</div>
            </div>
            <div className="flex flex-col">
              {pageItems.length === 0 ? (
                <div className="px-6 py-10 text-center font-body-md text-body-md text-on-surface-variant">
                  No submissions yet for this period.
                </div>
              ) : (
                pageItems.map((l) => {
                  const isCurrentUser = currentUserId !== null && l.profileId === currentUserId;
                  return (
                    <div
                      key={l.profileId}
                      className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-surface-variant/30 items-center hover:bg-surface-container-lowest/50 transition-colors ${isCurrentUser ? "bg-surface" : ""}`}
                    >
                      <div className="col-span-2">
                        {l.rank <= 3 ? (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md font-bold shadow-sm ${RANK_BG[l.rank]}`}>{l.rank}</div>
                        ) : (
                          <span className="font-body-md text-body-md font-medium text-on-surface-variant pl-3">{l.rank}</span>
                        )}
                      </div>
                      <div className="col-span-4 flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-secondary-fixed-dim/30 flex items-center justify-center font-label-md text-label-md text-secondary font-bold shrink-0">
                          {initialsFor(l.fullName, l.email)}
                        </div>
                        <span className="font-body-md text-body-md font-medium text-on-surface truncate">
                          {l.fullName ?? l.email}
                          {isCurrentUser && <span className="text-on-surface-variant font-normal"> (You)</span>}
                        </span>
                      </div>
                      <div className="col-span-2 font-body-md text-body-md text-on-surface text-right font-medium">{l.totalProblemsSolved}</div>
                      <div className="col-span-2 font-body-md text-body-md text-on-surface text-right font-semibold">{l.overallAccuracy}%</div>
                      <div className="col-span-2 font-body-md text-body-md text-on-surface-variant text-right">{l.totalSqlSubmissions + l.totalProgrammingSubmissions}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={entries.length} onPageChange={setPage} itemLabel="users" />
    </>
  );
}
