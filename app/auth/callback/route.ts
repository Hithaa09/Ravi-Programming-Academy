import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Handles Supabase PKCE auth callbacks — email verification links and
 * password-reset links both land here. Exchanges the one-time code for a
 * session cookie, then redirects the user to the intended destination.
 *
 * Supabase appends ?code=<code>&next=<path> to the redirectTo URL.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data.session?.user;

      // First-time Google sign-in auto-creates a student account, same as
      // most sites — but Profile.email is unique, so if this email already
      // belongs to a Profile under a *different* auth id (e.g. an existing
      // email/password account), upserting here would either crash on the
      // unique constraint or silently mix up whose account this is. Block
      // only that specific collision, before touching the Profile table.
      const hasOnlyGoogleIdentity =
        user?.identities?.length === 1 &&
        user.identities[0].provider === "google";
      if (hasOnlyGoogleIdentity && user) {
        const existingProfile = await prisma.profile.findUnique({
          where: { email: user.email! },
          select: { id: true },
        });
        if (existingProfile && existingProfile.id !== user.id) {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            `${origin}/login?error=google_email_taken`
          );
        }
      }

      // Upsert profile on code exchange. Role is derived from Supabase metadata
      // so that admin profiles always carry role="admin" — this prevents admin
      // test submissions from appearing in student metrics. Only app_metadata
      // is trusted — it's server-only; user_metadata is client-editable, so it
      // must never factor into a role decision.
      if (user) {
        const metaRole = user.app_metadata?.role as string | undefined;
        const profileRole = metaRole === "admin" ? "admin" : "student";
        await prisma.profile.upsert({
          where: { id: user.id },
          update: { role: profileRole },
          create: {
            id: user.id,
            email: user.email!,
            fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
            role: profileRole,
            status: "active",
          },
        });
      }

      // Redirect admins to the admin dashboard instead of the student dashboard.
      if (next === "/dashboard") {
        const role = user?.app_metadata?.role;
        if (role === "admin") {
          return NextResponse.redirect(`${origin}/admin/dashboard`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Anything unexpected — send back to login so the user can try again.
  return NextResponse.redirect(`${origin}/login`);
}
