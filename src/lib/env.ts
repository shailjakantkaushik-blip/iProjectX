/**
 * Unified env resolution for Vercel dashboard keys.
 *
 * Primary names match Vercel → Project → Environment Variables:
 *   DIRECT_URL, DATABASE_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *   SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY,
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL,
 *   TURNSTILE_SECRET_KEY, NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_APP_URL
 *
 * Legacy VITE_* / short aliases remain as fallbacks for local/Lovable.
 * NEXT_PUBLIC_* are exposed to the client via vite.config envPrefix.
 */

function first(...values: Array<string | undefined | null>): string | undefined {
  for (const v of values) {
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

function metaEnv(key: string): string | undefined {
  try {
    // Vite injects import.meta.env at build time (VITE_* and NEXT_PUBLIC_*)
    const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
    return env?.[key];
  } catch {
    return undefined;
  }
}

/** Postgres pooler URL (Prisma / server DB) */
export function getDatabaseUrl(): string | undefined {
  return first(process.env.DATABASE_URL);
}

/** Postgres direct (non-pooler) URL for migrations */
export function getDirectUrl(): string | undefined {
  return first(process.env.DIRECT_URL, process.env.DATABASE_URL);
}

/** Public Supabase URL — safe for browser */
export function getSupabaseUrl(): string | undefined {
  return first(
    metaEnv("NEXT_PUBLIC_SUPABASE_URL"),
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    metaEnv("VITE_SUPABASE_URL"),
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_URL,
  );
}

/** Anon / publishable key — safe for browser */
export function getSupabasePublishableKey(): string | undefined {
  return first(
    metaEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    metaEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    metaEnv("VITE_SUPABASE_ANON_KEY"),
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY,
    metaEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
  );
}

/** Service role / secret — server only, never expose to client */
export function getSupabaseServiceRoleKey(): string | undefined {
  return first(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SERVICE_KEY,
  );
}

export function getStripeSecretKey(): string | undefined {
  return first(process.env.STRIPE_SECRET_KEY, process.env.STRIPE_API_KEY);
}

export function getStripeWebhookSecret(): string | undefined {
  return first(process.env.STRIPE_WEBHOOK_SECRET);
}

export function getStripePublishableKey(): string | undefined {
  return first(
    metaEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    metaEnv("VITE_STRIPE_PUBLISHABLE_KEY"),
    process.env.VITE_STRIPE_PUBLISHABLE_KEY,
    process.env.STRIPE_PUBLISHABLE_KEY,
  );
}

/** Cloudflare Turnstile secret — server only */
export function getTurnstileSecretKey(): string | undefined {
  return first(process.env.TURNSTILE_SECRET_KEY);
}

export function getAppName(): string {
  return (
    first(
      metaEnv("NEXT_PUBLIC_APP_NAME"),
      process.env.NEXT_PUBLIC_APP_NAME,
      metaEnv("VITE_APP_NAME"),
      process.env.VITE_APP_NAME,
      process.env.APP_NAME,
    ) || "iProjectX"
  );
}

export function getAppUrl(): string {
  return (
    first(
      metaEnv("NEXT_PUBLIC_APP_URL"),
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.APP_URL,
      metaEnv("VITE_APP_URL"),
      process.env.VITE_APP_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ) || "http://localhost:5173"
  );
}

/** Cloudflare R2 (S3-compatible) — optional object storage */
export function getCloudflareR2Config() {
  const accountId = first(process.env.CLOUDFLARE_ACCOUNT_ID, process.env.CF_ACCOUNT_ID);
  const accessKeyId = first(
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    process.env.R2_ACCESS_KEY_ID,
    process.env.CF_R2_ACCESS_KEY_ID,
  );
  const secretAccessKey = first(
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    process.env.R2_SECRET_ACCESS_KEY,
    process.env.CF_R2_SECRET_ACCESS_KEY,
  );
  const bucket = first(
    process.env.CLOUDFLARE_R2_BUCKET,
    process.env.R2_BUCKET,
    process.env.CF_R2_BUCKET,
  );
  const publicBaseUrl = first(
    process.env.CLOUDFLARE_R2_PUBLIC_URL,
    process.env.R2_PUBLIC_URL,
    process.env.CF_R2_PUBLIC_URL,
  );
  const endpoint =
    first(process.env.CLOUDFLARE_R2_ENDPOINT, process.env.R2_ENDPOINT) ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint, publicBaseUrl };
}

export function getServiceStatus() {
  return {
    supabase: Boolean(getSupabaseUrl() && getSupabasePublishableKey()),
    supabaseAdmin: Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey()),
    database: Boolean(getDatabaseUrl()),
    directUrl: Boolean(getDirectUrl()),
    stripe: Boolean(getStripeSecretKey()),
    stripePublishable: Boolean(getStripePublishableKey()),
    turnstile: Boolean(getTurnstileSecretKey()),
    cloudflareR2: Boolean(getCloudflareR2Config()),
    appName: getAppName(),
    appUrl: getAppUrl(),
  };
}
