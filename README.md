# iProjectX

Enterprise PMO portfolio app (TanStack Start) + legacy Streamlit pack.

## Live

Deploy on Vercel project **`i-project-x`**.  
Setup guide: [`DEPLOY.md`](./DEPLOY.md)  
Env template: [`.env.example`](./.env.example)

## Stack

- TanStack Start + Vite + Nitro → Vercel
- Supabase Auth + Postgres + RLS
- Stripe Checkout subscriptions
- Cloudflare R2 (optional storage)

## Env (Vercel)

Use these exact names (see `.env.example`):

`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`

## Local

```bash
cp .env.example .env
npm install
npm run dev
```
