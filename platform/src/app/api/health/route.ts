import { NextResponse } from "next/server";
import { checkEnv, getEnv } from "@/lib/env";

/**
 * Public health/config probe.
 * Confirms Vercel/local env injection works without leaking secret values.
 */
export async function GET() {
  const env = getEnv();
  const check = checkEnv();

  return NextResponse.json({
    ok: check.ok,
    service: env.appName,
    source: check.source,
    vercel: env.isVercel,
    nodeEnv: env.nodeEnv,
    config: {
      present: check.present,
      missing: check.missing,
      databaseConfigured: Boolean(env.databaseUrl),
      supabaseAuthConfigured: Boolean(env.supabaseUrl && env.supabaseAnonKey),
      serviceRoleConfigured: Boolean(env.supabaseServiceRoleKey),
    },
    hints: check.hints,
  });
}
