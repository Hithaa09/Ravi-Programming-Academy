"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateNewPassword } from "@/lib/password-policy";

export interface AuthResult {
  error: string | null;
  requiresEmailConfirmation?: boolean;
}

export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult> {
  const signupLimit = checkRateLimit("signup", getClientIp());
  if (!signupLimit.allowed) {
    return { error: "Too many signup attempts from this network. Please wait a while and try again." };
  }

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
  const loginLimit = checkRateLimit("login", getClientIp());
  if (!loginLimit.allowed) {
    return { error: "Too many login attempts from this network. Please wait a while and try again." };
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  const role = data.user?.app_metadata?.role;

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
  // Same "login" bucket as the student signIn() above, intentionally — see
  // the comment on RATE_LIMITS.login in lib/rate-limit.ts.
  const loginLimit = checkRateLimit("login", getClientIp());
  if (!loginLimit.allowed) {
    return { error: "Too many login attempts from this network. Please wait a while and try again." };
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: error.message };

  // Role lives only in app_metadata, set via the Supabase dashboard or the
  // service-role API — user_metadata is never trusted for this, since a
  // signed-in user can edit it themselves (supabase.auth.updateUser).
  const role = data.user?.app_metadata?.role;

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
  const resetLimit = checkRateLimit("passwordReset", getClientIp());
  if (!resetLimit.allowed) {
    return { error: "Too many password reset requests from this network. Please wait a while and try again." };
  }

  const supabase = createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const validationError = validateNewPassword(password);
  if (validationError) return { error: validationError };

  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };
  return { error: null };
}
