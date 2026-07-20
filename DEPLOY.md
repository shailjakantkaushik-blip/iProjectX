# iProjectX — Deploy & integrations

This repo is a **TanStack Start** (Vite + Nitro) PMO app with the legacy Streamlit tool under `PMO_ENTERPRISE_TOOL/`.

## Vercel

1. Import GitHub repo `iProjectX` into Vercel project **`i-project-x`**.
2. Framework: auto-detect TanStack Start / Nitro (or leave blank).
3. Build command: `bun run build` or `npm run build`
4. Install command: `bun install` or `npm install`
5. Root directory: empty (repo root)
6. Set env vars from [`.env.example`](./.env.example) for Production + Preview.

`vite.config.ts` pins Nitro `preset: "vercel"` for this deployment.

## Supabase

Required env (aliases supported):

| Purpose | Env names (any one works) |
|--------|---------------------------|
| URL | `VITE_SUPABASE_URL`, `SUPABASE_URL` |
| Browser key | `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY` |
| Admin key | `SUPABASE_SERVICE_ROLE_KEY` |

Apply SQL: `supabase/migrations/*.sql` in Supabase SQL Editor, then also:

`supabase/migrations/20260720120000_stripe_org_fields.sql`

Auth → URL config: add `https://i-project-x.vercel.app/**` to redirect URLs.

## Stripe

| Env | Purpose |
|-----|---------|
| `STRIPE_SECRET_KEY` | Server checkout + webhooks |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verify |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Optional client |
| `STRIPE_PRICE_TEAM` | Stripe Price id for Team |
| `STRIPE_PRICE_BUSINESS` | Stripe Price id for Business |
| `APP_URL` | Success/cancel redirect base |

Webhook endpoint:

`https://i-project-x.vercel.app/api/stripe/webhook`

Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

## Cloudflare R2

Optional object storage (Excel/exports). Env:

`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_PUBLIC_URL`

Helpers: `src/lib/cloudflare-r2.ts`

## Health check

`GET /api/health` → `{ ok, services: { supabase, stripe, cloudflareR2, ... } }`

Billing page `/app/billing` also shows connection badges.
