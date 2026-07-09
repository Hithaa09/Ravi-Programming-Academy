import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { user, response } = await createMiddlewareClient(request);

  const isAuthenticated = !!user;
  const role = user?.user_metadata?.role ?? user?.app_metadata?.role;
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
    // Uses the Supabase REST client (anon key + user's session cookie) so no
    // service-role key is needed, provided the profiles table is readable by
    // authenticated users (RLS off, or a policy: SELECT where id = auth.uid()).
    if (!isAdmin && user) {
      const { createServerClient } = await import("@supabase/ssr");
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: () => {},
          },
        }
      );
      const { data: profile } = await supabase
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
