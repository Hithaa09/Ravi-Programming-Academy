"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || role !== "admin") throw new Error("Unauthorized");
}

export interface PurchaseRecord {
  id: number;
  studentId: string;
  studentEmail: string;
  studentName: string | null;
  provider: string;
  providerReference: string | null;
  amount: number | null;
  currency: string;
  status: string;
  createdAt: Date;
}

// Small dataset by this project's own scale (50–300 students, at most a few
// hundred purchases) — a single unpaginated fetch with client-side
// search/filter, matching AdminProgrammingProblemsTable's pattern, rather
// than the server-paginated approach used for the (larger) students list.
export async function getPurchases(): Promise<PurchaseRecord[]> {
  await requireAdmin();

  const rows = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: { profile: { select: { email: true, fullName: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentEmail: r.profile.email,
    studentName: r.profile.fullName,
    provider: r.provider,
    providerReference: r.providerReference,
    amount: r.amount,
    currency: r.currency,
    status: r.status,
    createdAt: r.createdAt,
  }));
}
