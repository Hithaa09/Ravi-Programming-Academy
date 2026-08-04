# Ravi Programming Academy — Project Status

_Last updated: 2026-07-29. This document exists to brief Claude (or anyone else) on everything done so far, without needing to re-explain the whole history. Update the "Last updated" date whenever this file is revised._

## What this project is

A self-hosted, single-server coding education platform for 50–300 students. Next.js 14 (App Router) + TypeScript + Tailwind, Prisma over PostgreSQL (via Supabase), Supabase Auth (email/password + Google OAuth), Judge0 for programming-language grading, a custom isolated child-process SQL judge. No CI/CD, no Dockerfile, no Kubernetes — deploys are manual (`npm ci && npx prisma migrate deploy && npm run build && npm run start`). See `DEPLOYMENT.md` for the full deploy/rollback runbook and `README.md` for the (default, not very useful) create-next-app boilerplate.

**Established constraints that apply to all future work on this project**, repeated explicitly across many requests: no Redis, no Kubernetes/microservices, no CDN/WAF, no IP banning, no CAPTCHA, no invite-code/email-domain signup restrictions, no enterprise infrastructure — everything sized for a single server and 50–300 students.

---

## Work completed, in roughly chronological order

### 1. Core hardening pass (integration review fixes)
- SQL problem publish validation now checks for *meaningful* hidden-dataset content, not just array length.
- Ownership-safe stale-lock reclaim for `ProgrammingSubmissionLock`/`SqlSubmissionLock`/the in-memory Run lock — fixes a race where a slow original request's delayed release could delete a legitimately-reclaimed second lock. Uses `createdAt` as a zero-schema-change ownership token for the DB locks, a `crypto.randomUUID()` token for the in-memory one.
- Prisma migration workflow established: `prisma/migrations/` baselined, `prisma migrate deploy` is the mandated deploy step, `prisma db push` is now forbidden going forward.

### 2. Critical security fix — privilege escalation (already fixed, verified live)
Found and fixed a **Critical** vulnerability: every authorization check in the app used to trust `user?.app_metadata?.role ?? user?.user_metadata?.role` — since `user_metadata` is client-editable via `supabase.auth.updateUser()`, any signed-up student could self-grant admin access. Fixed by removing the `user_metadata` fallback everywhere (~19 occurrences across ~15 files, including `middleware.ts`, `lib/auth/actions.ts`, every `requireAdmin()`). `scripts/set-admin-role.js` is now the only way to grant admin (via `SUPABASE_SERVICE_ROLE_KEY`). Verified via live re-exploitation attempt (blocked) against the real Supabase project.

### 3. Abuse prevention / rate limiting
- `lib/rate-limit.ts` — in-memory sliding-window limiter, zero dependencies. Per-user limits: Run 15/min, Submit 8/min, admin bulk-import 5/hour.
- Later extended with **per-IP** limits (since signup/login/password-reset happen before a session exists, so there's no `userId` to key on): signup 10/hour, login 10/15min (shared bucket between student and admin login forms on purpose), password-reset 5/hour. `getClientIp()` reads `x-forwarded-for`/`x-real-ip`.
- A full abuse-prevention audit found these were the only real gaps — Run/Submit/SQL/Judge0/file-upload/admin-endpoint protection were all already solid.

### 4. Resilience / dependency handling
- Judge0 integration (`lib/judge0.ts`) already has retries with backoff, per-attempt timeouts, and distinct friendly error messages per failure kind (config/network/http/timeout/invalid_response) — confirmed already well-built, no changes needed.
- SQL judge (`lib/sql/run-isolated.ts`) runs each query in a real child process (not a worker_thread — verified `terminate()` can't actually stop a stuck native call), SIGKILL timeout, bounded concurrency (max 10 workers, FIFO queue).
- File parsing (`lib/actions/parse-problem-file.ts`) — try/catch per file, 10MB size cap, corrupted/empty ZIP handling.

### 5. Observability
- `lib/log.ts` — zero-dependency structured JSON logger (`logError`/`logWarn`/`logInfo`), replaced every `console.error` call site.
- `/health` endpoint (`app/health/route.ts`) — checks Prisma DB connectivity + Judge0 reachability, no auth, no dashboards. Required a middleware fix (`/health` had to be excluded from the auth-required route check, or unauthenticated health checks would get redirected to `/login`).

### 6. `DEPLOYMENT.md` — rollback + self-hosted-Judge0 sections
Added: failed-deployment recovery, previous-build recovery via git, failed-Prisma-migration guidance (no true down-migration exists — forward-fix or restore from backup), env-var rollback, a post-deploy verification checklist. **Most recently, a full self-hosted Judge0 migration runbook** — see the dedicated section below, this is the current open item.

### 7. UI/UX audit + fixes
Two rounds of audit (general UI/UX, then a final performance/UX pass) found and fixed:
- **Settings pages were completely non-functional** — both "Save Changes" and "Update Password" forms were `onSubmit={(e) => e.preventDefault()}` no-ops with zero backend. Now genuinely wired: `lib/actions/settings.ts` has `updateFullName`/`updatePassword` (the latter re-authenticates via `signInWithPassword` before allowing a change). Email editing intentionally left disabled (changing Supabase's own login-identity email is a bigger, riskier feature than this pass warranted).
- **Bookmarks were fake** — a bookmark icon toggled local React state with zero persistence (lost on refresh). No backend exists for it; disabled the control with a "not available yet" label rather than inventing new persistence.
- Added missing `aria-label`/`title` to icon-only pagination prev/next buttons and the modal close button.
- Confirmed already-good: loading skeletons (19 routes), empty states, delete-confirmation modals, Run/Submit disabled/spinner states, Judge0/SQL/caching/optimistic-rendering decisions.

### 8. Privacy Policy & Terms of Service
Created `/privacy` and `/terms` (real, specific content — not boilerplate — covering Supabase Auth, Google OAuth, Judge0 as a data processor, data retention, user rights). Linked from the login/signup page with the required "By creating an account, you agree to..." line. Required a `middleware.ts` fix (both routes needed adding to the public-route exclusion list, same lesson as `/health`).

### 9. Database performance audit
Reviewed every index against actual query patterns. Conclusion: **indexing is already appropriate for this scale**, no missing or unused indexes found. One informational note (not an indexing fix): the leaderboard/dashboard queries fetch all student submissions and filter date ranges in JS rather than in SQL — fine at current scale, worth revisiting only if the platform runs multiple cohorts over years and the table grows substantially.

### 10. Secrets & session security audit
Reviewed `NEXT_PUBLIC_*` usage, logging discipline, cookie/session handling. Found everything solid except one real gap (now fixed, see below): the forgot-password recovery flow had zero server-side password validation.

### 11. Password-reset validation fix + a build bug it caused (also fixed)
Extracted `validateNewPassword` (min 8 chars) into a function shared by both the authenticated Settings password change and the forgot-password `updatePassword()` flow, so both enforce the same policy server-side (previously the reset flow only had a client-side `minLength={6}` hint, trivially bypassable).

**This initially broke `npm run build`** — a `"use server"` file can only export async Server Actions, and the shared validator was a plain sync function. Fixed by moving it to a new non-server module, `lib/password-policy.ts`.

### 12. Full build verification (found and fixed 2 more real, independent bugs)
Running an actual `npm run build` (not just `tsc`/`eslint`, which don't catch these) surfaced two more issues, both now fixed:
- 3 pre-existing lint errors (`admin-dashboard.ts` unused destructured vars from an intentional discard-via-rest-spread pattern; `lib/sql/comparator.ts` a variable that should've been `const`) were actually **blocking every production build**, since `next build` runs ESLint as a hard gate. Fixed with minimal, behavior-preserving changes.
- `/login` failed static prerendering (`useSearchParams()` needs a Suspense boundary) — pre-existing, unrelated to anything changed this session, never caught before because a full build was never run to completion earlier in the engagement. Fixed by splitting the page into an outer `<Suspense>` wrapper + inner component.
- `npm run build` now passes cleanly, all 30 routes. Verified live against a real `npm run start` production server.

### 13. One real account deletion (already done, not pending)
Found and deleted a leftover test account (`rheamehra020@gmail.com` / "rhea") from the real, live Supabase project connected via `.env.local`. Turned out to be an orphaned `Profile` row with no matching Supabase Auth user (the Auth side was already gone). Confirmed zero submissions before deleting. **Important standing fact:** `.env.local` in this repo is wired to a real Supabase project, not disposable seed data — treat any data found there with the same care.

### 14. TestSprite MCP connected
Registered via `claude mcp add testsprite -e API_KEY=... -- npx -y @testsprite/testsprite-mcp@latest`, confirmed `✔ Connected` via `claude mcp list`. A product-spec doc was written for its "Product Specification Doc" upload requirement (copy at `~/Desktop/product-spec.md`). Dev server run/CSS issue encountered and fixed along the way (see below) — was a leftover stale process from an earlier `npm run start`, not a real app bug.

**Status: configured, not yet run to completion.** Recommended: create one throwaway test account before letting it touch authenticated flows, rather than using it against real student data.

---

## Judge0 self-hosting — the current open thread

**Status: researched and documented, not yet executed.** This is what the user said they'd come back to decide on.

- The app already fully supports `JUDGE0_MODE=selfhosted` in code (`lib/judge0.ts`) — this is purely a server-provisioning + config change, zero code changes needed.
- Current production config is `JUDGE0_MODE=rapidapi`, RapidAPI Basic tier (pay-per-use, cost is negligible at this scale — see below). Self-hosting was always the intended end state; RapidAPI was explicitly a testing-only stopgap.
- A full runbook is now in `DEPLOYMENT.md` under "Migrating to self-hosted Judge0," covering: getting an official Judge0 CE release, the critical `AUTHN_HEADER=Authorization` config gotcha (Judge0's default is `X-Auth-Token`, which would silently 401 every request if left as-is), correct docker-compose startup order, binding Judge0 to localhost only, and the env vars to update.
- **Must run on a real Linux server, not the local Mac** — Judge0's `isolate` sandboxing has known compatibility problems under Docker Desktop's macOS VM.

### Pending decision: which server/provider

Checked current pricing for a comparable 4 vCPU / 8GB machine:
- **Hetzner Cloud**: ~$8/month (€6.49) — cheapest by a wide margin, 20TB egress, EU + 1 US region (Ashburn, VA).
- **DigitalOcean**: ~$48/month — ~6x pricier for the same specs, more regions, nicer UX.
- Vultr/Linode: similar tier to DigitalOcean.

Recommendation given so far: Hetzner on price, unless there's a specific reason to prefer DigitalOcean's UX/region coverage. Needs a plain VM with full Docker access (not a PaaS like Render/Railway/Fly.io — those don't allow the privileged cgroup access `isolate` needs). Simplest placement is the **same server** the Next.js app already runs on (matches the existing single-server architecture, zero network latency, Judge0 bound to `127.0.0.1` only) — a second, separate server is only worth it if Judge0's CPU load under a submission burst turns out to compete with the app itself.

### Pre-cutover checklist (already written up, not yet executed)
1. Provision the server, follow the `DEPLOYMENT.md` runbook, verify Judge0 responds directly (`curl .../languages`) before touching the app.
2. Manually test all 7 languages the app uses (C, C++, Java, Python, JavaScript, Perl, VB — `JUDGE0_LANGUAGE_IDS` in `lib/judge0.ts`) — self-hosted Judge0 CE isn't guaranteed to have identical language coverage to what RapidAPI's hosted instance had configured.
3. Load-test realistic concurrency (the app's own rate limits already cap this at 15 runs/min + 8 submits/min per student).
4. **Keep the RapidAPI subscription active through the cutover** — don't cancel it until self-hosted is proven, since the rollback plan (`JUDGE0_MODE` env var flip) is worthless if the fallback no longer exists.
5. Cut over, watch `/health` + real submissions closely, then cancel RapidAPI once confident.
6. Once proven, update `.env.example`/"Required environment variables" in `DEPLOYMENT.md` to document `selfhosted` as the new default (intentionally not done yet).

---

## Things intentionally left alone (not bugs, decisions already made)

- Problem-list caching, SQL-form missing success toast, admin-submissions-list unselected `code`/`query` fields, `lib/auth/helpers.ts`'s unused `getSession()` dead code — all flagged in audits as 🟢 "nice after launch," explicitly not worth doing now.
- Email editing on Settings pages — deliberately disabled rather than built out, given the complexity/risk of changing a Supabase Auth login identity.
- No self-service account deletion — by design for this instructor-managed platform; account deletion goes through direct DB/Auth admin action (as done for the one real cleanup above).
