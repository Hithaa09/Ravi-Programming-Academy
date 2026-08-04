import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { user, response, supabase: middlewareSupabase } = await createMiddlewareClient(request);

  const isAuthenticated = !!user;
  // app_metadata is only writable via the Supabase service-role API (or the
  // dashboard) — never trust user_metadata for role, it's end-user-editable
  // from the browser (supabase.auth.updateUser({ data: { role: "admin" } })
  // would otherwise let any signed-in student grant themselves admin).
  const role = user?.app_metadata?.role;
  const isAdmin = isAuthenticated && role === "admin";

  // ── Route classification ──────────────────────────────────────────────────
  const isStudentLoginPage = pathname === "/login";
  const isAdminLoginPage   = pathname === "/admin/login";
  // Admin routes: everything under /admin except /admin/login
  const isAdminRoute  = pathname.startsWith("/admin") && !isAdminLoginPage;
  // Student routes: everything that isn't /admin/*, public auth pages, or /
  const isStudentRoute =
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/auth/") &&   // /auth/callback and any future auth routes
    pathname !== "/login" &&
    pathname !== "/forgot-password" &&
    pathname !== "/health" &&           // must stay publicly reachable, no auth
    pathname !== "/webhooks/razorpay" && // Razorpay's server calls this directly — no session, must stay public
    pathname !== "/privacy" &&          // linked from the signup form, must be readable pre-account
    pathname !== "/terms" &&            // same as /privacy
    pathname !== "/";

  // ── Already signed in → redirect away from login pages ───────────────────
  if (isStudentLoginPage && isAuthenticated) {
    return NextResponse.redirect(
      new URL(isAdmin ? "/admin/dashboard" : "/dashboard", request.url)
    );
  }

  if (isAdminLoginPage && isAuthenticated) {
    return NextResponse.redirect(
      new URL(isAdmin ? "/admin/dashboard" : "/dashboard", request.url)
    );
  }

  // ── Protect admin routes ──────────────────────────────────────────────────
  if (isAdminRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    // Authenticated but not an admin (student) → student dashboard
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // ── Protect student routes ────────────────────────────────────────────────
  if (isStudentRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Admins are allowed to browse student routes (for review/QA purposes).

    // Block suspended students and students whose profile no longer exists.
    // Reuses the same Supabase client createMiddlewareClient already built
    // above (anon key + user's session cookie) rather than constructing a
    // second one from scratch just for this one read — same query, same
    // enforcement, one fewer client/cookie-handler setup per request.
    if (!isAdmin && user) {
      const { data: profile } = await middlewareSupabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .single();

      // profile === null  → deleted profile; treat same as suspended.
      // profile.status === "suspended"  → explicitly suspended.
      const blocked = profile === null || profile?.status === "suspended";
      if (blocked) {
        const errorParam = profile === null ? "no_profile" : "suspended";
        // Build the redirect response FIRST, then wire sign-out cookies onto
        // it. This is the only way to clear the session cookie in middleware —
        // setAll must write to the response headers, not request.cookies.
        const signoutRedirect = NextResponse.redirect(
          new URL(`/login?error=${errorParam}`, request.url)
        );
        const supabaseSignout = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll: () => request.cookies.getAll(),
              setAll: (cookiesToSet) => {
                cookiesToSet.forEach(({ name, value, options }) =>
                  signoutRedirect.cookies.set(name, value, options ?? {})
                );
              },
            },
          }
        );
        await supabaseSignout.auth.signOut();
        return signoutRedirect;
      }
    }
  }

  // Pass through — response already carries refreshed session cookies.
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     *   _next/static  — Next.js build output
     *   _next/image   — image optimisation API
     *   favicon.ico   — browser icon
     *   image files   — svg, png, jpg, jpeg, gif, webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
