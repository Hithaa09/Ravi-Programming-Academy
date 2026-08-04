import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// React cache() deduplicates this call for the duration of a single server
// request. Without this, concurrent server actions (e.g. Promise.all in the
// dashboard page) each call supabase.auth.getUser() independently — when the
// JWT needs refreshing, all concurrent callers try to refresh simultaneously,
// and all but the first get a stale/invalidated session error that surfaces
// as "Something went wrong" in the UI.
export const getAuthUser = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
});
