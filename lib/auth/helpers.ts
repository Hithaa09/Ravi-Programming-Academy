import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// Validates the token against the Supabase server — safe to trust for auth decisions.
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

// Returns the locally cached session — fast but unvalidated. Use for optimistic UI only.
export async function getSession(): Promise<Session | null> {
  const supabase = createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) return null;
  return session;
}

// Subscribe to auth state changes. Returns an unsubscribe function.
export function onAuthStateChange(callback: (user: User | null) => void) {
  const supabase = createClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}
