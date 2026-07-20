# iProjectX — Deploy & integrations

This repo is a **TanStack Start** (Vite + Nitro) PMO app with the legacy Streamlit tool under `PMO_ENTERPRISE_TOOL/`.

## Vercel

**Use only project `i-project-x`.** Do not keep a second Git-connected project (e.g. `i-project-x-fozw`) on this repo — each push triggers both and doubles Hobby build usage / rate limits.

### Keep only `i-project-x`
1. Open [Vercel Dashboard](https://vercel.com/dashboard) → project **`i-project-x-fozw`** (or any duplicate).
2. **Settings → Git → Disconnect** from `iProjectX` (or **Settings → General → Delete Project** if unused).
3. Confirm **`i-project-x`** remains connected to GitHub repo `iProjectX`, production branch **`main`**.
4. Production URL: `https://i-project-x.vercel.app`

### Project settings (`i-project-x`)
1. Framework: auto-detect TanStack Start / Nitro (or leave blank).
2. Build command: `npm run build` (or `bun run build`)
3. Install command: `npm install` (or `bun install`)
4. Root directory: empty (repo root)
5. Set env vars from [`.env.example`](./.env.example) for Production + Preview.

`vite.config.ts` pins Nitro `preset: "vercel"` and exposes `NEXT_PUBLIC_*` to the client bundle.

## Environment variables (match Vercel dashboard)

| Env | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres pooler connection string |
| `DIRECT_URL` | Postgres direct connection (migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server admin) |
| `SUPABASE_SECRET_KEY` | Supabase secret key alias (server) |
| `STRIPE_SECRET_KEY` | Stripe checkout + webhooks |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verify |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (optional) |
| `NEXT_PUBLIC_APP_NAME` | Product name in UI / titles |
| `NEXT_PUBLIC_APP_URL` | Success/cancel redirect base |

Apply SQL in Supabase SQL Editor (in order):

1. `supabase/migrations/20260720095542_fe684dfb-a86c-4dee-8677-269ef34d6e6d.sql`
2. `supabase/migrations/20260720120000_stripe_org_fields.sql`
3. `supabase/migrations/20260720140000_seed_sample_portfolio.sql`

**Sample data not showing?** RLS only returns `public.projects` for your org. Legacy `"Project"` / Acme demo rows are invisible. Either click **Load sample portfolio** on Executive Cockpit, or run `supabase/SEED_SAMPLE_PORTFOLIO.sql` (edit the email).

Auth → URL config: add `https://i-project-x.vercel.app/**` to redirect URLs.

## Stripe

Webhook endpoint:

`https://i-project-x.vercel.app/api/stripe/webhook`

Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

Optional price ids: `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_BUSINESS`.

## Cloudflare R2

Optional object storage (Excel/exports). Env:

`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_PUBLIC_URL`

Helpers: `src/lib/cloudflare-r2.ts`

## Health check

`GET /api/health` → `{ ok, services: { supabase, stripe, database, turnstile, ... } }`

Billing page `/app/billing` also shows connection badges.
