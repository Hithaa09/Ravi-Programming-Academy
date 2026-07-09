"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StudentProfile, StudentListResult } from "@/lib/actions/admin-students";
import { activateStudent, suspendStudent, createStudent } from "@/lib/actions/admin-students";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

function initialsFrom(profile: StudentProfile): string {
  const src = profile.fullName ?? profile.email;
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

interface Props {
  initial: StudentListResult;
  initialSearch: string;
  initialStatus: string;
  initialPage: number;
  pageSize: number;
}

export function StudentsClientPage({ initial, initialSearch, initialStatus, initialPage, pageSize }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  const [addOpen, setAddOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  function navigate(params: { search?: string; status?: string; page?: number; size?: number }) {
    const sp = new URLSearchParams();
    const s = params.search ?? search;
    const st = params.status ?? statusFilter;
    const p = params.page ?? page;
    const sz = params.size ?? rowsPerPage;
    if (s) sp.set("search", s);
    if (st && st !== "all") sp.set("status", st);
    if (p > 1) sp.set("page", String(p));
    if (sz !== 25) sp.set("size", String(sz));
    startTransition(() => router.push(`/admin/students?${sp.toString()}`));
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    navigate({ search: value, page: 1 });
  }

  function handleStatus(value: string) {
    setStatusFilter(value);
    setPage(1);
    navigate({ status: value, page: 1 });
  }

  function handlePageChange(p: number) {
    setPage(p);
    navigate({ page: p });
  }

  function handlePageSize(sz: number) {
    setRowsPerPage(sz);
    setPage(1);
    navigate({ size: sz, page: 1 });
  }

  async function handleToggleStatus(student: StudentProfile) {
    const action = student.status === "active" ? suspendStudent : activateStudent;
    await action(student.id);
    startTransition(() => router.refresh());
  }

  async function handleSaveStudent() {
    if (!email || !password) return;
    setAddLoading(true);
    setAddError(null);
    const result = await createStudent({ email, password, fullName });
    setAddLoading(false);
    if (result.error) { setAddError(result.error); return; }
    setAddOpen(false);
    setFullName(""); setEmail(""); setPassword("");
    startTransition(() => router.refresh());
  }

  const { students, total } = initial;

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Students</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => handleStatus(e.target.value)}
            className="border border-outline-variant/40 rounded-lg text-sm py-1.5 px-3 bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <Button onClick={() => setAddOpen(true)}>
            <span className="material-symbols-outlined text-[18px]">add</span> Add Student
          </Button>
        </div>
      </div>

      <div className={`bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-card overflow-hidden ${isPending ? "opacity-60" : ""}`}>
        <div className="flex items-center justify-end gap-2 px-6 pt-4">
          <label className="font-label-sm text-label-sm text-on-surface-variant">Rows per page</label>
          <select
            value={rowsPerPage}
            onChange={(e) => handlePageSize(Number(e.target.value))}
            className="border border-outline-variant/40 rounded-lg text-sm py-1.5 px-3 bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
          >
            {ROWS_PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low/50 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary-fixed-dim/30 flex items-center justify-center font-label-md text-label-md text-secondary font-bold">
                        {initialsFrom(s)}
                      </div>
                      <span className="font-medium text-on-surface">{s.fullName ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{s.email}</td>
                  <td className="px-6 py-4 text-on-surface-variant capitalize">{s.role}</td>
                  <td className="px-6 py-4"><StatusPill status={s.status} /></td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {s.createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/students/${s.id}`}>
                        <Button variant="secondary" className="!py-1.5 !px-3">View</Button>
                      </Link>
                      <Button
                        variant={s.status === "active" ? "danger-outline" : "secondary"}
                        className="!py-1.5 !px-3"
                        onClick={() => handleToggleStatus(s)}
                      >
                        {s.status === "active" ? "Suspend" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-on-surface-variant">
                    No students match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-2">
          <Pagination page={page} pageSize={rowsPerPage} total={total} onPageChange={handlePageChange} itemLabel="students" />
        </div>
      </div>

      {addOpen && (
        <Modal title="Add Student" onClose={() => { setAddOpen(false); setAddError(null); setFullName(""); setEmail(""); setPassword(""); }}>
          <div className="space-y-5">
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                className="w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="font-label-md text-label-md font-bold text-on-surface block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-white border border-outline-variant/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            {addError && <p className="font-label-md text-label-md text-error">{addError}</p>}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => { setAddOpen(false); setAddError(null); }}>Cancel</Button>
              <Button onClick={handleSaveStudent} disabled={!email || !password || addLoading}>
                {addLoading ? "Creating…" : "Create Student"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
