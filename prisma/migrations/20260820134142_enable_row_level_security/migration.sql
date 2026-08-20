-- Enables Postgres Row-Level Security on every application table in the
-- public schema, with no policies attached.
--
-- Why this is safe: this app's Prisma connection (DATABASE_URL / DIRECT_URL)
-- authenticates as the `postgres` role, which has BYPASSRLS and therefore
-- ignores RLS entirely — confirmed directly against this project's own
-- database before writing this migration. So none of the app's own queries
-- are affected by this change in any way.
--
-- Why this matters anyway: Supabase auto-exposes every table in this schema
-- through its own public PostgREST REST API, reachable directly with
-- nothing but the public NEXT_PUBLIC_SUPABASE_ANON_KEY (which is, by design,
-- visible in the deployed site's JS bundle). This app never queries via that
-- REST API itself — every read/write goes through Prisma in a Next.js
-- Server Action — but the REST API endpoint is live regardless. With RLS
-- disabled (the state this migration corrects) and zero policies, any
-- request to that API using the anon key could read or write every row in
-- every one of these tables directly, completely bypassing every
-- requireAdmin()/session check this app's own code enforces.
--
-- With RLS enabled and no policies defined, Postgres denies all access by
-- default to any role that doesn't bypass RLS (i.e. `anon`/`authenticated`,
-- the roles Supabase's REST API and client-side SDK actually use) — exactly
-- the desired outcome, since this app has no legitimate use for that REST
-- path at all. If a legitimate future use case needs it (e.g. Supabase
-- Realtime on a specific table), add a scoped policy for that table then,
-- rather than leaving RLS off for everything in the meantime.

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "programming_problems" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "programming_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "programming_submission_locks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sql_problems" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sql_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sql_submission_locks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_settings" ENABLE ROW LEVEL SECURITY;
