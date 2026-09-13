"use client";

import { useMemo, useState } from "react";
import type { AuditLogEntry } from "@/lib/actions/admin-audit-log";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { InfoPopover } from "@/components/ui/InfoPopover";

const PAGE_SIZE = 25;

const SELECT_CLASS =
  "border border-outline-variant/40 rounded-lg text-sm py-2 px-4 focus:outline-none focus:ring-1 focus:ring-secondary bg-white";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// "student.suspend" -> "Student Suspend" — readable without a hand-maintained
// label table per action, so a newly logged action never needs UI code too.
function formatAction(action: string): string {
  return action
    .split(".")
    .join(" ")
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AdminAuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  const actionOptions = useMemo(() => Array.from(new Set(entries.map((e) => e.action))).sort(), [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (actionFilter && e.action !== actionFilter) return false;
      if (!q) return true;
      return (
        e.adminEmail.toLowerCase().includes(q) ||
        (e.adminName ?? "").toLowerCase().includes(q) ||
        (e.targetId ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, search, actionFilter]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Audit Log</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {entries.length} recorded action{entries.length !== 1 ? "s" : ""} — who did what, and when.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput
          placeholder="Search by admin or target ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className={SELECT_CLASS}
        >
          <option value="">All Actions</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>{formatAction(a)}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low/50 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Admin</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-4 py-4 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center font-body-md text-body-md text-on-surface-variant">
                    No audit log entries match your filters.
                  </td>
                </tr>
              ) : (
                pageItems.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-on-surface max-w-[220px]">
                      <div className="line-clamp-1">{e.adminName || e.adminEmail}</div>
                      {e.adminName && <div className="font-label-sm text-label-sm text-on-surface-variant line-clamp-1">{e.adminEmail}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full font-label-sm text-label-sm font-medium bg-surface-container-low text-on-surface-variant">
                        {formatAction(e.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {e.targetId ? `${e.targetType ?? ""} ${e.targetId}`.trim() : "—"}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-4 text-center">
                      <InfoPopover rows={[
                        { label: "Admin ID", value: e.adminEmail },
                        { label: "Target Type", value: e.targetType ?? "—" },
                        { label: "Target ID", value: e.targetId ?? "—" },
                        { label: "Details", value: e.details ? JSON.stringify(e.details) : "—" },
                      ]} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-2">
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} itemLabel="entries" />
        </div>
      </div>
    </div>
  );
}
