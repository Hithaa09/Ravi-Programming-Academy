"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || role !== "admin") throw new Error("Unauthorized");
}

export interface AuditLogEntry {
  id: number;
  adminEmail: string;
  adminName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

// Small dataset by this project's own scale — a single unpaginated fetch
// with client-side search/filter, matching AdminPurchasesTable's pattern.
// Capped at 500 rows as a sane ceiling, same reasoning as
// getAllProgrammingSubmissions — this is a trace-back tool, not something
// that needs full historical depth in one screen.
export async function getAuditLogEntries(): Promise<AuditLogEntry[]> {
  await requireAdmin();

  const rows = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { admin: { select: { email: true, fullName: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    adminEmail: r.admin.email,
    adminName: r.admin.fullName,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    details: r.details as Record<string, unknown> | null,
    createdAt: r.createdAt,
  }));
}
