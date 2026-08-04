"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export interface BackfillResult {
  scanned: number;
  created: number;
  alreadyExisted: number;
}

async function requireAdmin(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || role !== "admin") throw new Error("Unauthorized");
}

/**
 * Derives Profile rows from the denormalized studentId/studentEmail fields on
 * existing SqlSubmission rows. Safe to run multiple times — never creates
 * duplicates. Students with no SQL submissions are not reachable this way;
 * they will receive a profile on their next login via the signUp/callback flow.
 */
export async function backfillProfiles(): Promise<BackfillResult> {
  await requireAdmin();
  // Collect every unique (studentId, studentEmail) pair from submissions.
  const raw = await prisma.sqlSubmission.findMany({
    select: { studentId: true, studentEmail: true },
    distinct: ["studentId"],
  });

  const scanned = raw.length;
  if (scanned === 0) return { scanned: 0, created: 0, alreadyExisted: 0 };

  // Fetch which profile IDs already exist so we can skip them.
  const existingIds = new Set(
    (
      await prisma.profile.findMany({
        where: { id: { in: raw.map((r) => r.studentId) } },
        select: { id: true },
      })
    ).map((p) => p.id)
  );

  const toCreate = raw.filter((r) => !existingIds.has(r.studentId));

  if (toCreate.length > 0) {
    await prisma.profile.createMany({
      data: toCreate.map((r) => ({
        id: r.studentId,
        email: r.studentEmail,
        role: "student",
        status: "active",
      })),
      skipDuplicates: true,
    });
  }

  return {
    scanned,
    created: toCreate.length,
    alreadyExisted: scanned - toCreate.length,
  };
}
