"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BOOKMARKS, PROBLEMS } from "@/lib/mock-data";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge, DifficultyDot, DifficultyLabel } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 10;

export default function BookmarksPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    return BOOKMARKS
      .map((b, i) => ({ ...b, idx: i }))
      .filter((b) => !removed.has(b.idx))
      .filter((b) => !search || b.problemTitle.toLowerCase().includes(search.toLowerCase()));
  }, [search, removed]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex items-baseline gap-4 mb-8">
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Bookmarks</h1>
        <span className="font-label-md text-label-md text-on-surface-variant">{filtered.length} Bookmarked</span>
      </div>

      <SearchInput
        placeholder="Search bookmarks..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="mb-6 bg-white rounded-lg border border-outline-variant/20 shadow-sm py-1"
      />

      <div className="bg-surface-container-lowest shadow-card border border-outline-variant/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-outline-variant/10">
          <thead className="bg-surface-container-low/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Problem</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Difficulty</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Language</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Bookmarked On</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10 text-sm">
            {pageItems.map((b) => (
              <tr key={b.idx} className="hover:bg-surface-container-low/40 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-on-surface flex items-center gap-3">
                  <DifficultyDot difficulty={b.difficulty} /> {b.problemTitle}
                </td>
                <td className="px-6 py-4 whitespace-nowrap"><DifficultyLabel difficulty={b.difficulty} /></td>
                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={b.status} /></td>
                <td className="px-6 py-4 whitespace-nowrap text-on-surface-variant">{b.language}</td>
                <td className="px-6 py-4 whitespace-nowrap text-on-surface-variant">{b.bookmarkedOn}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-3">
                    {(() => {
                      const match = PROBLEMS.find((p) => p.title === b.problemTitle);
                      return match ? (
                        <Link
                          href={`/solve/${match.id}`}
                          className="font-label-md text-label-md text-secondary font-medium hover:underline"
                        >
                          Solve
                        </Link>
                      ) : null;
                    })()}
                    <button
                      type="button"
                      onClick={() => setRemoved((prev) => new Set(prev).add(b.idx))}
                      className="text-on-surface-variant/60 hover:text-error transition-colors"
                      aria-label="Remove bookmark"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-on-surface-variant">No bookmarks match your search.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} itemLabel="bookmarks" />
    </div>
  );
}
