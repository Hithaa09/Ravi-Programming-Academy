"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface AuthResult {
  error: string | null;
  requiresEmailConfirmation?: boolean;
}

export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) return { error: error.message };

  // Create the Profile immediately. data.user is populated even when email
  // confirmation is pending, so we can persist the profile now. upsert
  // ensures a re-submitted signup form never creates a duplicate.
  if (data.user) {
    await prisma.profile.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        email: data.user.email!,
        fullName: fullName || null,
        role: "student",
        status: "active",
      },
    });
  }

  // When email confirmation is enabled in Supabase, data.session is null
  // and the user must verify their email before they can sign in.
  if (!data.session) return { error: null, requiresEmailConfirmation: true };

  return { error: null };
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  const role = data.user?.user_metadata?.role ?? data.user?.app_metadata?.role;

  if (role === "admin") {
    await supabase.auth.signOut();
    return {
      error:
        "This is an administrator account. Please use the Admin Login page.",
    };
  }

  // Block suspended students before a session is established. Checking here
  // prevents the middleware sign-out / re-login loop that would occur if we
  // relied solely on middleware to catch suspension.
  if (data.user) {
    const profile = await prisma.profile.findUnique({
      where: { id: data.user.id },
      select: { status: true },
    });
    if (profile?.status === "suspended") {
      await supabase.auth.signOut();
      return { error: "Your account has been suspended. Please contact your administrator." };
    }
  }

  return { error: null };
}

export async function adminSignIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: error.message };

  // Role is stored in user_metadata (set via Supabase dashboard) or
  // app_metadata (set via service-role API). Check both.
  const role =
    data.user?.user_metadata?.role ?? data.user?.app_metadata?.role;

  if (role !== "admin") {
    await supabase.auth.signOut();
    return {
      error: "Access denied. This account does not have admin privileges.",
    };
  }

  // Ensure the admin has a Profile row with role="admin". This corrects any
  // existing Profile that was created as "student" before admin access was granted,
  // and prevents admin test submissions from appearing in student metrics.
  if (data.user) {
    await prisma.profile.upsert({
      where: { id: data.user.id },
      update: { role: "admin" },
      create: {
        id: data.user.id,
        email: data.user.email!,
        fullName: (data.user.user_metadata?.full_name as string | undefined) ?? null,
        role: "admin",
        status: "active",
      },
    });
  }

  return { error: null };
}

export async function resetPasswordEmail(email: string): Promise<AuthResult> {
  const supabase = createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };
  return { error: null };
}
