"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PurchaseRecord } from "@/lib/actions/admin-purchases";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { InfoPopover } from "@/components/ui/InfoPopover";

const PAGE_SIZE = 25;

const SELECT_CLASS =
  "border border-outline-variant/40 rounded-lg text-sm py-2 px-4 focus:outline-none focus:ring-1 focus:ring-secondary bg-white";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" });
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

export function AdminPurchasesTable({ purchases }: { purchases: PurchaseRecord[] }) {
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<"" | "manual" | "razorpay">("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter((p) => {
      if (provider && p.provider !== provider) return false;
      if (!q) return true;
      return p.studentEmail.toLowerCase().includes(q) || (p.studentName ?? "").toLowerCase().includes(q);
    });
  }, [purchases, search, provider]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalRevenuePaise = purchases
    .filter((p) => p.status === "completed" && p.amount !== null)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Purchases</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {purchases.length} purchase{purchases.length !== 1 ? "s" : ""} · Total collected: {formatAmount(totalRevenuePaise, "INR")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput
          placeholder="Search by student name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <select
          value={provider}
          onChange={(e) => { setProvider(e.target.value as "" | "manual" | "razorpay"); setPage(1); }}
          className={SELECT_CLASS}
        >
          <option value="">All Providers</option>
          <option value="razorpay">Razorpay</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low/50 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-4 py-4 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center font-body-md text-body-md text-on-surface-variant">
                    No purchases match your filters.
                  </td>
                </tr>
              ) : (
                pageItems.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-on-surface max-w-[240px]">
                      <Link href={`/admin/students/${p.studentId}`} className="hover:underline">
                        <div className="line-clamp-1">{p.studentName || p.studentEmail}</div>
                        {p.studentName && <div className="font-label-sm text-label-sm text-on-surface-variant line-clamp-1">{p.studentEmail}</div>}
                      </Link>
                    </td>
                    <td className="px-6 py-4"><ProviderPill provider={p.provider} /></td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatAmount(p.amount, p.currency)}</td>
                    <td className="px-6 py-4 text-on-surface-variant capitalize">{p.status}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-4 text-center">
                      <InfoPopover rows={[
                        { label: "Purchase ID", value: String(p.id) },
                        { label: "Provider Reference", value: p.providerReference ?? "—" },
                        { label: "Student ID", value: p.studentId },
                      ]} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-2">
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} itemLabel="purchases" />
        </div>
      </div>
    </div>
  );
}
