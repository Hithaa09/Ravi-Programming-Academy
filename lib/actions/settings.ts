"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/log";
import { validateNewPassword } from "@/lib/password-policy";

export type SettingsResult = { error: string } | { success: true };

export interface MyPurchase {
  id: number;
  provider: string;
  providerReference: string | null;
  amount: number | null;
  currency: string;
  status: string;
  createdAt: Date;
}

const MAX_FULL_NAME_LENGTH = 100;

// Derives the student from the session — never trusts a caller-supplied id,
// matching every other self-scoped read in this codebase (hasLifetimeAccess,
// run-code, submit-code).
export async function getMyPurchases(): Promise<MyPurchase[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.purchase.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      provider: true,
      providerReference: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function updateFullName(fullName: string): Promise<SettingsResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const trimmed = fullName.trim();
  if (!trimmed) return { error: "Full name cannot be empty." };
  if (trimmed.length > MAX_FULL_NAME_LENGTH) {
    return { error: `Full name must be ${MAX_FULL_NAME_LENGTH} characters or fewer.` };
  }

  try {
    await prisma.profile.update({ where: { id: user.id }, data: { fullName: trimmed } });
  } catch (err) {
    logError("Failed to update full name", {
      userId: user.id,
      context: { error: err instanceof Error ? err.message : String(err) },
    });
    return { error: "Something went wrong. Please try again." };
  }

  return { success: true };
}

// Requires the current password (re-authenticates via signInWithPassword
// before calling updateUser) rather than trusting the active session alone —
// the UI's "Current Password" field only means something if it's actually
// checked, otherwise anyone at an unlocked, signed-in session could change
// the password with no verification at all.
export async function updatePassword(currentPassword: string, newPassword: string): Promise<SettingsResult> {
  if (!currentPassword || !newPassword) return { error: "All password fields are required." };
  const validationError = validateNewPassword(newPassword);
  if (validationError) return { error: validationError };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You must be signed in." };

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) return { error: "Current password is incorrect." };

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    logError("Failed to update password", {
      userId: user.id,
      context: { error: updateError.message },
    });
    return { error: "Something went wrong. Please try again." };
  }

  return { success: true };
}
