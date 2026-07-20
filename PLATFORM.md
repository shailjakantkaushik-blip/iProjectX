# iProjectX Platform

Multi-tenant SaaS for enterprise project management and delivery.

The Next.js app lives at the **repository root**. Legacy Streamlit + Excel code is under `legacy/`.

## Capabilities

- **Web SaaS app** (Next.js) with interactive dashboards and module navigation
- **Multi-tenant organizations** with role-based access (`owner`, `admin`, `executive`, `bu_lead`, `pm`)
- **Seat-based subscriptions**: Starter / Professional / Enterprise
- **White-label branding**: brand name, colors, logo URL, tagline, custom domain (plan-gated)
- **Supabase Auth** for login/signup + Postgres app schema (`supabase/schema.sql`)
- **Excel round-trip**: download template → fill → upload → upsert DB
- **Executive PPT/PDF export** including business-case infographic slides
- **Platform Admin** controls landing page + global feature flags
- **Delivery OS modules**: cockpit, projects/programs, stage-gates, financials, risks, pipeline, resources, agile, governance, data/exports, settings

## Quick start

```bash
npm install
cp .env.example .env
# fill DATABASE_URL + NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo (after SQL seed): `demo@iprojectx.com` / `demo1234`

## Deploy on Vercel

1. Import this GitHub repo
2. **Root Directory** = leave **empty** (repo root)
3. Framework = Next.js
4. Add env vars (see `VERCEL.md` and `.env.example`)
5. Deploy

See `VERCEL.md` for full checklist.
