-- Closes the last gap flagged by Supabase's own security linter
-- (rls_disabled_in_public): _prisma_migrations was the one public-schema
-- table deliberately left out of the earlier RLS migration, since it holds
-- no student data — just migration file names, checksums, and timestamps.
-- Enabling RLS here costs nothing (this app's Prisma connection uses the
-- `postgres` role, which bypasses RLS regardless, confirmed when RLS was
-- first enabled on every other table), and closes the finding for good —
-- no policies needed, same default-deny-to-anon/authenticated reasoning as
-- every other table.

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
