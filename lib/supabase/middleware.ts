import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Creates a Supabase client that reads/writes cookies via NextRequest and
 * NextResponse. Must only be used inside middleware.ts — not in Server
 * Components (use lib/supabase/server.ts there instead).
 *
 * Returns the validated user, the response object (with refreshed session
 * cookies already set on it), and the client itself so callers needing an
 * additional read (e.g. the suspended-student check) can reuse it instead of
 * constructing a second client from scratch. Always return `response`
 * instead of creating a new NextResponse, otherwise the refreshed cookies
 * will be lost.
 */
export async function createMiddlewareClient(
  request: NextRequest
): Promise<{ user: User | null; response: NextResponse; supabase: SupabaseClient }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto the request so they're visible within this
          // middleware execution, then rebuild the response so the same
          // cookies reach the browser.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT with the Supabase server on every request.
  // Never use getSession() here — it trusts the cookie without re-validation.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, response, supabase };
}
