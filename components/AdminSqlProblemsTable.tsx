"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { SqlProblemListItem } from "@/lib/actions/sql-problems";
import { DifficultyPill, QuestionStatusPill } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { InfoPopover } from "@/components/ui/InfoPopover";

const PAGE_SIZE = 5;

const SELECT_CLASS =
  "border border-outline-variant/40 rounded-lg text-sm py-2 px-4 focus:outline-none focus:ring-1 focus:ring-secondary bg-white";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function AdminSqlProblemsTable({ problems }: { problems: SqlProblemListItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") ?? "";
  const currentDifficulty = searchParams.get("difficulty") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const currentAvailability = searchParams.get("availability") ?? "";

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [currentSearch, currentDifficulty, currentStatus, currentAvailability]);

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
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const pageItems = problems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">SQL Problems</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/sql-problems/bulk-upload">
            <Button variant="secondary">
              <span className="material-symbols-outlined text-[18px]">upload_file</span> Bulk Upload
            </Button>
          </Link>
          <Link href="/admin/sql-problems/add">
            <Button>
              <span className="material-symbols-outlined text-[18px]">add</span> Add Problem
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput
          placeholder="Search SQL problems..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={currentDifficulty}
          onChange={(e) => updateFilter("difficulty", e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">All Difficulty</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <select
          value={currentStatus}
          onChange={(e) => updateFilter("status", e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Published">Published</option>
          <option value="Archived">Archived</option>
        </select>
        <select
          value={currentAvailability}
          onChange={(e) => updateFilter("availability", e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">All Availability</option>
          <option value="Locked">Locked</option>
          <option value="Available">Available</option>
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low/50 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Difficulty</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Actions</th>
                <th className="px-6 py-4 text-right">Solve</th>
                <th className="px-4 py-4 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center font-body-md text-body-md text-on-surface-variant">
                    No SQL problems match your filters.
                  </td>
                </tr>
              ) : (
                pageItems.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-on-surface max-w-[260px]">
                      <div className="flex items-start gap-1.5">
                        {p.status === "Published" && (
                          <span
                            className="material-symbols-outlined text-[14px] shrink-0 mt-0.5 text-on-surface-variant/50"
                            title={p.availability === "Available" ? "Visible to students" : "Hidden from students"}
                          >
                            {p.availability === "Available" ? "lock_open" : "lock"}
                          </span>
                        )}
                        <div className="line-clamp-2" title={p.title}>{p.title}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><QuestionStatusPill status={p.status} /></td>
                    <td className="px-6 py-4"><DifficultyPill difficulty={p.difficulty} /></td>
                    <td className="px-6 py-4 text-on-surface-variant">{p.category}</td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/sql-problems/${p.id}`}>
                        <Button variant="secondary" className="!py-1.5 !px-3">Edit</Button>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/sql-problems/${p.id}/preview`}>
                        <Button className="!py-1.5 !px-3">
                          <span className="material-symbols-outlined text-[14px]">code</span> Solve
                        </Button>
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <InfoPopover rows={[
                        { label: "Created", value: formatDate(p.createdAt) },
                        { label: "Updated", value: formatDate(p.updatedAt) },
                        { label: "Category", value: p.category },
                      ]} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-2">
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={problems.length}
            onPageChange={setPage}
            itemLabel="problems"
          />
        </div>
      </div>
    </div>
  );
}
