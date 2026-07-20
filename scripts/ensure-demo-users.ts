/**
 * Reset demo Auth passwords via Supabase Admin API (most reliable).
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/ensure-demo-users.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMOS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    email: "demo@iprojectx.com",
    password: "demo1234",
    name: "Alex Morgan",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "exec@iprojectx.com",
    password: "demo1234",
    name: "Jordan Lee",
  },
] as const;

async function ensureUser(demo: (typeof DEMOS)[number]) {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = listed?.users?.find(
    (u) => u.email?.toLowerCase() === demo.email || u.id === demo.id
  );

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: demo.password,
      email_confirm: true,
      user_metadata: { name: demo.name },
    });
    if (error) throw error;
    console.log(`Updated password for ${demo.email}`);
    return;
  }

  const { error } = await admin.auth.admin.createUser({
    id: demo.id,
    email: demo.email,
    password: demo.password,
    email_confirm: true,
    user_metadata: { name: demo.name },
  });
  if (error) throw error;
  console.log(`Created ${demo.email}`);
}

async function main() {
  for (const demo of DEMOS) {
    await ensureUser(demo);
  }
  console.log("Done. Login with demo@iprojectx.com / demo1234");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
