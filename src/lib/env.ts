/**
 * Environment access for iProjectX.
 *
 * On Vercel, variables from Project Settings → Environment Variables are
 * injected into `process.env` at build/runtime. Do NOT call the Vercel API
 * to fetch secrets at request time — that is slower and less secure.
 *
 * Locally, sync the same values with:
 *   npm run env:pull
 * (requires `vercel link` once; writes gitignored `.env.local`)
 */

export type AppEnv = {
  databaseUrl: string;
  directUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePublishableKey: string;
  appName: string;
  appUrl: string;
  isVercel: boolean;
  nodeEnv: string;
};

function read(name: string, fallback = "") {
  return (process.env[name] || fallback).trim();
}

/** Read env from process.env (populated by Vercel or `.env.local`). */
export function getEnv(): AppEnv {
  return {
    databaseUrl: read("DATABASE_URL"),
    directUrl: read("DIRECT_URL"),
    supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
    stripeSecretKey: read("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
    stripePublishableKey: read("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    appName: read("NEXT_PUBLIC_APP_NAME", "iProjectX"),
    appUrl: read("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    isVercel: read("VERCEL") === "1",
    nodeEnv: read("NODE_ENV", "development"),
  };
}

export type EnvCheck = {
  ok: boolean;
  source: "vercel" | "local";
  missing: string[];
  present: string[];
  hints: string[];
};

const REQUIRED = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const OPTIONAL = [
  "DIRECT_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
] as const;

/** Validate required config without exposing secret values. */
export function checkEnv(): EnvCheck {
  const env = getEnv();
  const missing: string[] = [];
  const present: string[] = [];

  for (const key of REQUIRED) {
    const value =
      key === "DATABASE_URL"
        ? env.databaseUrl
        : key === "NEXT_PUBLIC_SUPABASE_URL"
          ? env.supabaseUrl
          : env.supabaseAnonKey;
    if (value) present.push(key);
    else missing.push(key);
  }

  for (const key of OPTIONAL) {
    const value =
      key === "SUPABASE_SERVICE_ROLE_KEY"
        ? env.supabaseServiceRoleKey
        : key === "NEXT_PUBLIC_APP_URL"
          ? env.appUrl
          : key === "STRIPE_SECRET_KEY"
            ? env.stripeSecretKey
            : key === "STRIPE_WEBHOOK_SECRET"
              ? env.stripeWebhookSecret
              : key === "DIRECT_URL"
                ? env.directUrl
                : env.stripePublishableKey;
    if (value) present.push(key);
  }

  const hints: string[] = [];
  if (missing.length) {
    if (env.isVercel) {
      hints.push(
        "Add the missing variables in Vercel → Project Settings → Environment Variables, then redeploy."
      );
    } else {
      hints.push(
        "Run `npm run env:pull` after `npx vercel link`, or copy `.env.example` to `.env.local` and fill values."
      );
    }
  }
  if (env.databaseUrl && env.databaseUrl.startsWith("file:")) {
    hints.push(
      "DATABASE_URL looks like SQLite (file:...). This app requires a Supabase PostgreSQL URL (postgresql://...)."
    );
  }
  if (!env.supabaseServiceRoleKey) {
    hints.push("SUPABASE_SERVICE_ROLE_KEY is optional but required for member invites via Auth Admin.");
  }
  if (!env.stripeSecretKey) {
    hints.push("STRIPE_SECRET_KEY is required to create and send enterprise invoices.");
  }
  if (env.stripeSecretKey && !env.stripeWebhookSecret) {
    hints.push("STRIPE_WEBHOOK_SECRET is required so paid invoices can activate subscriptions.");
  }

  return {
    ok: missing.length === 0,
    source: env.isVercel ? "vercel" : "local",
    missing,
    present,
    hints,
  };
}
