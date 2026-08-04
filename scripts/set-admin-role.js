// One-time admin provisioning script.
//
// app_metadata.role is the ONLY thing this app trusts for authorization
// (see middleware.ts / requireAdmin() helpers throughout lib/actions/) — and
// nothing in the app's own runtime code ever sets it, by design: it's
// deliberately kept out of any self-service flow (unlike user_metadata,
// which a signed-in user can edit themselves via supabase.auth.updateUser()
// and which this app never trusts for role, for exactly that reason).
// Making someone an admin is therefore this one manual, out-of-band step.
//
// Usage:
//   node scripts/set-admin-role.js someone@example.com
//
// Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in
// .env.local (same vars lib/actions/admin-students.ts's createStudent()
// already uses for the same kind of service-role operation).

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/set-admin-role.js <email>");
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

  // Supabase's admin API has no "get user by email" — page through listUsers().
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
    console.error(`No account found for ${email}. Create the account first (they must sign up once), then re-run this script.`);
    process.exit(1);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, role: "admin" },
  });
  if (updateError) {
    console.error("Failed to set app_metadata.role:", updateError.message);
    process.exit(1);
  }

  console.log(`app_metadata.role = "admin" set for ${email} (id: ${user.id}).`);
  console.log("They can now sign in at /admin/login. No other step is required — the Profile row is created/corrected automatically on their next successful admin login (see adminSignIn in lib/auth/actions.ts).");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
