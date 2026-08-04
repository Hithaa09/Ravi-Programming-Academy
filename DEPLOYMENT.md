# Deployment Guide

No CI/CD pipeline or deployment automation exists yet for this project (no `.github/workflows`, `Dockerfile`, or `vercel.json`) — deploys are currently manual. This document is the checklist to follow until that changes.

## Required environment variables

- `DATABASE_URL`, `DIRECT_URL` — Postgres connection strings (Supabase). `DATABASE_URL` should point at the pooled connection; `DIRECT_URL` is used by Prisma Migrate, which needs a direct (non-pooled) connection.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Auth.
- `NEXT_PUBLIC_SITE_URL` — used to build password-reset email links; set to the real production domain.
- `JUDGE0_MODE`, `JUDGE0_URL`, `JUDGE0_TOKEN` (and `JUDGE0_RAPIDAPI_HOST` if `JUDGE0_MODE=rapidapi`) — code execution backend.

See `.env.example` for the current documented subset; the Judge0 and Prisma vars above aren't in it yet.

- `SUPABASE_SERVICE_ROLE_KEY` — required for `scripts/set-admin-role.js` (see "Creating admin accounts" below) and for `createStudent` in `lib/actions/admin-students.ts`. Never expose this to the client — it's server/script-only.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — from the Razorpay dashboard (Settings → API Keys). Test-mode keys (`rzp_test_...`) work identically to live keys for development — no KYC needed to get started; live-mode keys require Razorpay's business verification. Whether checkout is actually reachable to students is controlled separately, live, from Admin → Settings → Payments (see `lib/payments/settings.ts`) — these env vars alone don't turn payments on.
- `RAZORPAY_WEBHOOK_SECRET` — generated when you add the webhook URL in the Razorpay dashboard (Settings → Webhooks → add `https://<your-domain>/webhooks/razorpay`, subscribe to the `payment.captured` event). This step needs a public URL, so it can only be done after deploying (or via an ngrok tunnel for local testing). Until this is set, real payments still work via the client-side checkout confirmation in `lib/payments/checkout.ts`'s `verifyPayment` — the webhook is a defense-in-depth backstop (covers the case where a student's browser closes before that confirmation call fires), not the only path to granting access.

## Creating admin accounts

This app trusts **only** `app_metadata.role` for authorization (see the security note in `middleware.ts`) — `user_metadata` is editable by the signed-in user themselves and is never trusted for role, on either the student or admin side. Nothing in the app's own runtime code sets `app_metadata.role` for anyone; making an account an admin is a deliberate, one-time, out-of-band step:

1. Have the person sign up normally first (so a Supabase Auth user exists for their email).
2. Run: `node scripts/set-admin-role.js their-email@example.com`
3. They can now sign in at `/admin/login`. Their `Profile` row's `role` column is created/corrected automatically on that first successful admin sign-in — no separate database step needed.

Equivalent manual alternative, if you'd rather not run the script: Supabase Dashboard → Authentication → Users → select the user → edit **App Metadata** (not User Metadata) → add `{"role": "admin"}`.

## Deploying to Vercel

Everything below this point in the file (deploy steps, rollback, self-hosting Judge0) assumes a traditional always-on server (`npm run start`). Vercel is serverless — no persistent process, functions run per-request, potentially on different instances. That mismatch matters in exactly two places in this app; read these before deploying, not after something breaks silently in front of students.

### Two real architectural risks, specific to serverless

1. **The SQL judge forks a real child process per query** (`lib/sql/run-isolated.ts`, `fork()` on `lib/sql/sql-worker.cjs`) — deliberate, because only a real OS process can be `SIGKILL`ed reliably to stop a runaway `better-sqlite3` call (`worker_threads` can't; this was verified directly). The fork target is a **runtime-constructed path**, not a static import, so Vercel's function bundler can't discover it by tracing imports and would otherwise silently omit it from the deployed function. `next.config.mjs`'s `outputFileTracingIncludes` now force-includes it — but **this has not been verified against real Vercel infrastructure**. Deploy to a preview URL first and manually run a real SQL Run and Submit before trusting this in production. If it still fails, the file inclusion isn't the only possible issue — `process.cwd()` and process-forking behavior inside Vercel's sandbox may not match a normal Linux server either.
2. **`lib/rate-limit.ts` and `lib/run-lock.ts` are in-memory, single-process by design** (built under this app's "single server, no Redis" philosophy). On Vercel, concurrent requests can land on different function instances with separate memory — so the "15 runs/60s" rate limit and the Run-overlap lock become *best-effort per-instance*, not a real global guarantee. Submit's overlap protection is unaffected (it's DB-backed: `ProgrammingSubmissionLock`/`SqlSubmissionLock`). For this app's actual scale (50–300 students) this is unlikely to matter in practice, but it's not the guarantee the code was written to provide — know that going in.

### Vercel-specific setup

- **`vercel.json`** already sets `maxDuration: 60` for all functions — Submit grades hidden test cases **sequentially**, each involving a Judge0 submission + poll (up to ~10s) or a SQL child-process run (up to 2.5s), so a problem with several hidden cases can add up past a default (much shorter) serverless timeout. Verify 60s is actually within your Vercel plan's allowed range (Hobby vs Pro limits change over time — check Vercel's current docs) and increase per-route if a specific problem's grading still times out.
- **Build command**: Vercel's default is just `next build` — this app requires `npx prisma migrate deploy` to run first (see the existing "Deploy steps" section above for why). Override the Build Command in Vercel's Project Settings to: `npx prisma migrate deploy && next build`. This means every deploy (including preview deployments, if `DATABASE_URL` is configured for Preview too) applies pending migrations — be deliberate about which Vercel environments get real database credentials.
- **Environment variables**: add everything from "Required environment variables" above in Vercel's Project Settings → Environment Variables. Set `NEXT_PUBLIC_SITE_URL` to the real Vercel URL (or custom domain) once you know it — you'll likely need one redeploy after the very first deploy to set this correctly.
- **Supabase Auth redirect URLs**: Supabase Dashboard → Authentication → URL Configuration — add the Vercel production URL (and preview URL pattern, if using preview deployments) to the allowed redirect URLs, or `/auth/callback` will fail after a real sign-in.
- **Razorpay webhook**: only registerable once you have a real public URL — see "Required environment variables" above for `RAZORPAY_WEBHOOK_SECRET`. Do this after the first successful deploy, not before.
- **Judge0**: no change needed for this deploy specifically — `JUDGE0_MODE=rapidapi` keeps working identically from Vercel, since it's just an outbound HTTPS call. Self-hosting Judge0 (see the section below) is a separate, later decision and doesn't depend on where the Next.js app itself is hosted.

### First-deploy verification (in addition to the checklist below)

Run through the existing "Deployment verification checklist" further down, but specifically do not skip the SQL Run/Submit check — that's the one item on this whole page most likely to fail silently on Vercel specifically.

## Deploy steps, in order

```bash
npm ci
npx prisma migrate deploy   # <-- REQUIRED before the app starts serving traffic
npm run build
npm run start
```

**`npx prisma migrate deploy` is the step this guide exists to call out.** It applies any migrations in `prisma/migrations/` that aren't yet recorded in the target database's `_prisma_migrations` table, in order, and does nothing if the database is already up to date — safe to run on every deploy, including ones with no schema change. Run it against the **production** `DATABASE_URL`/`DIRECT_URL`, not a dev database.

`npx prisma generate` does not need to be listed separately — `npm ci` installing `@prisma/client` triggers it automatically via that package's own `postinstall` hook.

## Do not use `prisma db push` from this point forward

`db push` was used prior to this project having migration history. It applies schema changes directly with no review step, no record of what changed, and no protection against accidentally dropping a column with real data in it. Now that `prisma/migrations/` exists (baselined via `0_init`), all schema changes go through `prisma migrate dev` (locally, generates a new migration file) and `prisma migrate deploy` (production, applies pending migrations). Running `db push` against a database that has migration history will make Prisma consider that database out of sync with its migration history the next time `migrate deploy` runs against it.

## Why this reduces schema drift

Before this guide, nothing enforced that a schema change made in development ever actually got applied to production — it was possible to change `schema.prisma`, test locally, and deploy the built app without production's database ever being told about the change. Because no deployment automation exists to enforce this step in code, the enforcement here is procedural: **this is now the one command every deploy must run**, in the same place, every time. If deployment automation (CI, a Dockerfile, a platform-specific build hook) is added later, `prisma migrate deploy` should be wired into it directly rather than left as a manual step — at that point, update this document to point at wherever it's now automated.

## Rollback

There's no blue-green setup and no orchestrator here — this is one server, deployed manually. Rollback on this project means "get the previous known-good state running again by hand," not an automated switchover. The procedures below are written for that reality, not for infrastructure this project doesn't have.

### If a deployment fails

"Failed" covers two different situations, and they need different responses:

- **The build itself fails** (`npm ci` or `npm run build` errors out) — the currently-running process on the server was never stopped, so the app is likely still serving the previous version. There's nothing to roll back; fix the build issue and redeploy.
- **The build succeeds but the new app crashes or misbehaves after `npm run start`** — this is the real rollback case, covered below.

Before starting *any* deploy, note the git commit currently live on the server (`git rev-parse HEAD` on the server, or check what commit/tag you last deployed). That one piece of information is what makes everything below possible — without it, "go back to what was working" has nothing to go back to.

### Recovering the previous build

Since there's no separate build-artifact store, the previous build is recovered from git, not from a saved image or artifact:

```bash
git checkout <previous-known-good-commit>
npm ci
npm run build
npm run start
```

This assumes the previous commit's dependencies and build still work on the current server — true as long as you're rolling back a small distance (the deploy that just failed), not reaching back months. Keep the server's working directory on a real commit (not uncommitted local changes) specifically so this is always possible.

### If a Prisma migration fails

Prisma does not have a built-in "undo the last migration" command — `migrate deploy` only ever applies forward. Plan around that rather than assuming a clean rollback exists:

- **Take a database backup or snapshot immediately before running `migrate deploy` in production**, every time, not just for risky-looking changes. Check what Supabase's backup/point-in-time-recovery options are available on your project's plan, and know how to trigger a restore *before* you need it, not while you're mid-incident.
- If `migrate deploy` itself fails partway (e.g., a constraint violation on existing data), Prisma will report exactly which migration failed and leave the database in a partially-applied state — it will **not** auto-revert. The realistic fix is almost always to write a *new forward migration* that corrects the problem (e.g., cleans up the data that violated a constraint, then re-applies), not to try to force a migration backward. This mirrors the guidance already given for `db push`: a new migration, reviewed and applied, is the safe path — never hand-edit the database directly to work around a failed migration, since that's exactly the kind of undocumented drift `prisma/migrations/` exists to prevent.
- If the schema change itself turns out to be wrong (not just a data conflict, but the wrong change entirely), the correct rollback is a new migration that reverses it, generated the normal way (`prisma migrate dev --name revert_x`) and deployed the normal way (`prisma migrate deploy`) — not a special rollback command, because Prisma doesn't have one.
- If the data itself is now corrupted and a new forward migration can't fix it, the backup from the first bullet is the actual recovery path — restore it, then figure out what went wrong before trying the migration again.

### Rolling back environment variables

There's no secrets manager or versioned config here — `.env.local` (or however production env vars are set on your host) is just a file. Before changing any production environment variable, keep a copy of the current values somewhere safe (a dated backup file kept outside the repo, or a note in whatever password manager already holds your other credentials) so a bad change can be reverted by restoring the exact previous value, not by trying to remember what it used to be. This matters most for `DATABASE_URL`/`DIRECT_URL` and the `JUDGE0_*` vars — getting either wrong doesn't crash the app outright, it just quietly breaks grading or code execution, which is easy to miss without the verification checklist below.

### Deployment verification checklist

Run through this after every deploy, rollback or otherwise, before considering it done:

- [ ] `GET /health` returns HTTP 200 with `"status": "ok"` — confirms the app is up, the database is reachable, and Judge0 is reachable, in one request.
- [ ] `prisma migrate deploy` output showed either newly-applied migrations completing successfully, or "already up to date" — not skipped, not errored.
- [ ] A real student login works (or a test account, not production student credentials).
- [ ] A real admin login works and reaches `/admin/dashboard`.
- [ ] One Run and one Submit succeed end-to-end on a real problem (Programming and SQL, if both changed in this deploy) — `/health` confirms Judge0 is *reachable*, not that grading actually works.
- [ ] No unexpected errors in the server's logs in the few minutes after startup.

If any item fails, that's the signal to roll back using the procedures above rather than leaving a partially-working deploy live.

## Migrating to self-hosted Judge0

This app already supports self-hosted Judge0 natively — `lib/judge0.ts`'s `getConfig()` branches on `JUDGE0_MODE`, and the `selfhosted` branch sends the token as a bare `Authorization` header (RapidAPI mode sends `X-RapidAPI-Key`/`X-RapidAPI-Host` instead). No code changes are needed; this is purely a server-provisioning + config change.

**Run this on the actual Linux server Judge0 will live on** — not a local Mac, since Judge0's sandboxing (`isolate`) depends on Linux cgroups and has known compatibility problems running inside Docker Desktop's macOS VM. If Judge0 will run on the same server as this app, that's fine and simplest — just bind it to localhost only (see below), not the public internet.

1. **Get the official Judge0 CE release** — download the latest stable release zip from `https://github.com/judge0/judge0/releases` (don't just clone `master`; releases are the pinned, documented path). Unzip it on the server.

2. **Generate a token** and edit `judge0.conf`:
   ```bash
   openssl rand -hex 32   # use the output as AUTHN_TOKEN below
   ```
   In `judge0.conf`, set:
   ```
   AUTHN_HEADER=Authorization
   AUTHN_TOKEN=<the generated token>
   ```
   **`AUTHN_HEADER=Authorization` is the critical line.** Judge0's own default is `X-Auth-Token` — leaving that default would make every request from this app fail authentication with no obvious cause, since the app always sends `Authorization`, not `X-Auth-Token`.

3. **Bring it up in the documented order** (Judge0's workers can crash-loop if they start before the database is ready):
   ```bash
   docker compose up -d db redis
   sleep 10
   docker compose up -d
   ```

4. **Bind it to localhost only**, assuming Judge0 runs on the same server as this app — edit the `server` service's ports in `docker-compose.yml` from `2358:2358` to `127.0.0.1:2358:2358` so Judge0 is never reachable from outside this machine. The app is the only thing that needs to reach it.

5. **Verify Judge0 itself is answering, before touching the app:**
   ```bash
   curl -H "Authorization: <the generated token>" http://127.0.0.1:2358/languages
   ```
   This should return a JSON list of supported languages, not a 401 or connection error.

6. **Update the app's production environment:**
   ```
   JUDGE0_MODE=selfhosted
   JUDGE0_URL=http://127.0.0.1:2358
   JUDGE0_TOKEN=<the same generated token>
   ```
   `JUDGE0_RAPIDAPI_HOST` is unused in `selfhosted` mode and can be removed. Back up the previous RapidAPI values first — see "Rolling back environment variables" above — so switching back is a one-line revert if something's wrong.

7. **Restart the app** so it picks up the new environment variables, then run through the same verification this guide already asks for after every deploy: `GET /health` should report `"judge0": "ok"`, and a real Run + Submit should succeed end-to-end.

**If code execution hangs or fails after containers are up and `/languages` responds correctly:** this is almost always the `isolate`/cgroups issue, not this app or Judge0's application code. Check which cgroup version the server is running (`mount | grep cgroup`) — Judge0's `isolate` sandbox has historically had the smoothest support on cgroup v1; cgroup v2 has needed extra configuration on some distributions. Check Judge0's own troubleshooting docs for the specific error before assuming it's an application bug.

Sources: [Judge0 CE API Docs](https://ce.judge0.com/), [judge0/judge0 docker-compose.yml](https://github.com/judge0/judge0/blob/master/docker-compose.yml), [Deploying Judge0 CE — Klutch.sh Docs](https://docs.klutch.sh/guides/open-source-software/judge0-ce/)
