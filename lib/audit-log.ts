// Records who did what and when, for the admin actions that matter to be
// able to trace back later — see the AdminAuditLog model's own comment in
// schema.prisma for exactly what's in and out of scope.
//
// Best-effort by design: a logging failure must never block or fail the
// real action it's recording (same reasoning as createProgrammingSubmission
// in submit-code.ts) — an admin being unable to suspend a student because
// the audit table had a hiccup would be a worse outcome than an occasional
// missing log entry.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/log";

export async function recordAuditLog(
  adminId: string,
  action: string,
  options?: { targetType?: string; targetId?: string; details?: Record<string, unknown> }
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetType: options?.targetType,
        targetId: options?.targetId,
        details: options?.details as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    logError("recordAuditLog failed", {
      userId: adminId,
      context: { action, error: e instanceof Error ? e.message : String(e) },
    });
  }
}
