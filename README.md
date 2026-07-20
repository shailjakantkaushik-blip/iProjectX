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

## Local

```bash
cp .env.example .env
npm install
npm run dev
```
