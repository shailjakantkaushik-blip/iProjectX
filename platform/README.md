# iProjectX Platform

Multi-tenant SaaS for enterprise project management and delivery.

This is the modern web product that replaces the legacy Streamlit + Excel desktop-style app in the repository root.

## Capabilities

- **Web SaaS app** (Next.js) with interactive dashboards and module navigation
- **Multi-tenant organizations** with role-based access (`owner`, `admin`, `executive`, `bu_lead`, `pm`)
- **Seat-based subscriptions**: Starter / Professional / Enterprise
- **White-label branding**: brand name, colors, logo URL, tagline, custom domain (plan-gated)
- **Supabase-ready Postgres schema** (`../supabase/schema.sql`)
- **Excel round-trip**: download template → fill → upload → upsert DB
- **Executive PPT/PDF export** including business-case infographic slides
- **Platform Admin** controls landing page + global feature flags
- **Delivery OS modules**:
  - Executive cockpit
  - Projects & programs (+ project infographic / business case)
  - Stage-gate delivery
  - Financials & benefits
  - Risks
  - Demand pipeline
  - Resources
  - Agile sprints & releases
  - Governance (decisions / actions)
  - Data & Exports
  - Workspace settings (billing, seats, members, branding, feature flags)

## Quick start

```bash
cd platform
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

| Email | Password | Role |
|-------|----------|------|
| `demo@iprojectx.com` | `demo1234` | Owner (Acme Delivery Hub) |
| `exec@iprojectx.com` | `demo1234` | Executive (read-only) |

## Tech stack

- Next.js App Router + TypeScript
- Prisma + SQLite (swap `DATABASE_URL` to Postgres for production)
- **Supabase Auth** for login/signup (org RBAC in app DB)
- Recharts + CSS motion for interactive UI
- Tailwind CSS v4

## Environment (Vercel)

**Production secrets belong in Vercel → Project Settings → Environment Variables.**  
The app reads them from `process.env` via `src/lib/env.ts` (no runtime Vercel API fetch).

Local sync from Vercel:

```bash
npx vercel link
npm run env:pull    # creates gitignored .env.local
```

See [`VERCEL.md`](./VERCEL.md) and [`../supabase/README.md`](../supabase/README.md).  
Check config (no secrets leaked): `GET /api/health`

## Excel import / executive export

- App → **Data & Exports**
- Download blank or current workbook, edit, upload
- Download PPT or PDF executive pack (all modules + business cases)

## Platform admin

Demo owner `demo@iprojectx.com` is a platform admin. Use **Platform Admin** to configure landing page copy, colors, and global Excel/PPT/PDF toggles.

## Legacy app

The original Streamlit/Excel PMO tool remains in the repository root for reference and data-model continuity. New product development happens in `platform/`.
