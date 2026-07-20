import { createClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabaseEnv } from "./env";

/** Service-role client for invites / admin user provisioning. Never expose to the browser. */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const key = getServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
