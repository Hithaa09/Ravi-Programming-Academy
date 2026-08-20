-- Fixes a real regression introduced by the previous migration
-- (enable_row_level_security): middleware.ts queries "profiles" via the
-- Supabase JS client (anon key + the user's own session, i.e. the
-- `authenticated` Postgres role — not Prisma, which is the only other
-- consumer of this table and connects as `postgres`, unaffected by RLS) on
-- every student request, to check suspension status. With RLS enabled and
-- zero policies, that query returns no row, and middleware's own logic
-- treats a missing profile as "deleted, therefore suspended" — signing out
-- every student on their very next request.
--
-- This policy grants exactly what that one read needs and nothing more:
-- an authenticated user may SELECT their own row (auth.uid() = id), no
-- other rows, no INSERT/UPDATE/DELETE. Every write to "profiles" still goes
-- exclusively through Prisma (the `postgres` role), so no write policy is
-- needed here. profiles.id is a Prisma `String` (Postgres `text`), while
-- auth.uid() returns `uuid` — cast to match.

CREATE POLICY "profiles_select_own" ON "profiles"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id);
