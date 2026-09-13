// Emergency recovery: removes all of an admin's enrolled two-factor
// authenticator apps, for when they've lost access to every device they
// enrolled (otherwise they'd be locked out of /admin entirely — middleware
// requires a completed second factor for any account with one enrolled).
//
// This is the service-role Admin API path specifically because the normal,
// self-service removeMfaFactor() (lib/auth/mfa.ts) requires the caller to
// already be at aal2 (i.e. already have a working authenticator) — which is
// exactly what's unavailable in this scenario. The service role bypasses
// that requirement, same trust model as scripts/set-admin-role.js.
//
// Usage:
//   node scripts/reset-admin-mfa.js someone@example.com
//
// Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in
// .env.local (same vars scripts/set-admin-role.js already uses).

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/reset-admin-mfa.js <email>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let user = null;
  let page = 1;
  while (!user) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error("Failed to list users:", error.message);
      process.exit(1);
    }
    user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user || data.users.length < 200) break;
    page += 1;
  }

  if (!user) {
    console.error(`No account found for ${email}.`);
    process.exit(1);
  }

  const factors = user.factors ?? [];
  if (factors.length === 0) {
    console.log(`${email} has no MFA factors enrolled — nothing to remove.`);
    return;
  }

  for (const factor of factors) {
    const { error } = await supabase.auth.admin.mfa.deleteFactor({ id: factor.id, userId: user.id });
    if (error) {
      console.error(`Failed to remove factor ${factor.id}:`, error.message);
      process.exit(1);
    }
    console.log(`Removed factor ${factor.id} (${factor.friendly_name ?? "unnamed"}).`);
  }

  console.log(`\nDone. ${email} can now sign in with just their password and re-enroll a new authenticator from Admin → Settings → Account.`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
