"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || role !== "admin") throw new Error("Unauthorized");
}

export interface PlatformSettingsRecord {
  paymentsEnabled: boolean;
  subscriptionPriceInr: number;
}

const SETTINGS_ID = 1;

// Singleton row, created lazily on first read/write — no manual seed step.
// Public read (the buy page and every premium-gate-adjacent view needs this,
// not just admins); writes are admin-only via updatePlatformSettings below.
export async function getPlatformSettings(): Promise<PlatformSettingsRecord> {
  const row = await prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
  return { paymentsEnabled: row.paymentsEnabled, subscriptionPriceInr: row.subscriptionPriceInr };
}

export async function updatePlatformSettings(
  input: { paymentsEnabled?: boolean; subscriptionPriceInr?: number }
): Promise<{ error: string | null }> {
  await requireAdmin();

  if (input.subscriptionPriceInr !== undefined) {
    if (!Number.isFinite(input.subscriptionPriceInr) || input.subscriptionPriceInr < 0) {
      return { error: "Price must be a non-negative number." };
    }
  }

  await prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    update: input,
    create: { id: SETTINGS_ID, ...input },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/buy-subscription");
  return { error: null };
}
