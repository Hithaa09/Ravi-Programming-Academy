"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { SqlProblemListItem } from "@/lib/actions/sql-problems";
import { SearchInput } from "@/components/ui/SearchInput";
import { SegmentedFilter } from "@/components/ui/SegmentedFilter";
import { Pagination } from "@/components/ui/Pagination";
import { DifficultyDot } from "@/components/ui/Badge";

const PAGE_SIZE = 10;
const DIFFICULTY_OPTIONS = ["All", "Easy", "Medium", "Hard"] as const;
type DifficultyFilter = (typeof DIFFICULTY_OPTIONS)[number];

export function StudentSqlTable({ problems }: { problems: SqlProblemListItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") ?? "";
  const rawDifficulty = searchParams.get("difficulty") ?? "";
  const currentDifficulty: DifficultyFilter = DIFFICULTY_OPTIONS.includes(rawDifficulty as DifficultyFilter)
    ? (rawDifficulty as DifficultyFilter)
    : "All";
  const currentAvailability = searchParams.get("availability") ?? "";

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [currentSearch, currentDifficulty, currentAvailability]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput === (searchParams.get("search") ?? "")) return;
      updateFilter("search", searchInput);
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "All") params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const pageItems = problems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-[1000px] mx-auto w-full pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-baseline gap-4">
          <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight">SQL</h1>
          <span className="font-label-md text-label-md text-on-surface-variant">{problems.length} Problem{problems.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-card overflow-hidden">
        <div className="p-4 border-b border-outline-variant/10 bg-surface-bright flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <SearchInput
            placeholder="Search SQL problems..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <SegmentedFilter<DifficultyFilter>
              options={[...DIFFICULTY_OPTIONS]}
              value={currentDifficulty}
              onChange={(v) => updateFilter("difficulty", v)}
            />
            <select
              value={currentAvailability}
              onChange={(e) => updateFilter("availability", e.target.value)}
              className="border border-outline-variant/40 rounded-lg text-sm py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-secondary bg-white"
            >
              <option value="">All</option>
              <option value="Available">Available</option>
              <option value="Locked">Locked</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-4 px-6 py-3 bg-surface-container-low border-b border-outline-variant/20">
          <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Problem</div>
          <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider w-48 text-right pr-4">Action</div>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {pageItems.length === 0 && (
            <div className="px-6 py-10 text-center text-on-surface-variant font-body-md text-body-md">
              No SQL problems match your filters.
            </div>
          )}
          {pageItems.map((p) => {
            const locked = p.availability === "Locked";
            return (
              <div key={p.id} className={`group flex items-center justify-between gap-3 px-6 py-4 transition-colors ${locked ? "opacity-60" : "hover:bg-surface-container-highest/20"}`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <DifficultyDot difficulty={p.difficulty} />
                  {locked ? (
                    <span className="font-label-md text-label-md text-on-surface-variant truncate min-w-0">{p.title}</span>
                  ) : (
                    <Link href={`/solve/sql/${p.id}`} className="font-label-md text-label-md text-on-surface group-hover:text-secondary transition-colors truncate min-w-0">
                      {p.title}
                    </Link>
                  )}
                  <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{p.difficulty}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {locked ? (
                    <span className="inline-flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant/60 px-4 py-1.5 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[16px]">lock</span> Locked
                    </span>
                  ) : (
                    <Link href={`/solve/sql/${p.id}`} className="bg-primary-container text-white font-label-md text-label-md px-4 py-1.5 rounded-lg hover:bg-primary-fixed-variant transition-colors shadow-sm whitespace-nowrap">
                      Solve Problem
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={problems.length} onPageChange={setPage} itemLabel="problems" />
    </div>
  );
}
