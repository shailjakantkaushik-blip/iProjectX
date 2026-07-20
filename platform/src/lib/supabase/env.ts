import { getEnv } from "@/lib/env";

export function getSupabaseEnv() {
  const env = getEnv();
  return {
    url: env.supabaseUrl,
    anonKey: env.supabaseAnonKey,
    configured: Boolean(env.supabaseUrl && env.supabaseAnonKey),
  };
}

export function getServiceRoleKey() {
  return getEnv().supabaseServiceRoleKey;
}
