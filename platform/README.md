# iProjectX Platform

Multi-tenant SaaS for enterprise project management and delivery.

This is the modern web product that replaces the legacy Streamlit + Excel desktop-style app in the repository root.

## Capabilities

- **Web SaaS app** (Next.js) with interactive dashboards and module navigation
- **Multi-tenant organizations** with role-based access (`owner`, `admin`, `executive`, `bu_lead`, `pm`)
- **Seat-based subscriptions**: Starter / Professional / Enterprise
- **White-label branding**: brand name, colors, logo URL, tagline, custom domain (plan-gated)
- **Delivery OS modules**:
  - Executive cockpit
  - Projects & programs
  - Stage-gate delivery
  - Financials & benefits
  - Risks
  - Demand pipeline
  - Resources
  - Agile sprints & releases
  - Governance (decisions / actions)
  - Workspace settings (billing, seats, members, branding)

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
- Cookie JWT auth (`jose` + `bcryptjs`)
- Recharts + CSS motion for interactive UI
- Tailwind CSS v4

## Environment

See `.env`:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="change-me"
NEXT_PUBLIC_APP_NAME="iProjectX"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Legacy app

The original Streamlit/Excel PMO tool remains in the repository root for reference and data-model continuity. New product development happens in `platform/`.
