# Supabase setup for iProjectX

Run these in order in **Supabase → SQL Editor** (copy / paste / Run):

| Step | File | Purpose |
|------|------|---------|
| 1 | [`schema.sql`](./schema.sql) | Create all tables, indexes, triggers, plans |
| 2 | [`sample_data_17_projects.sql`](./sample_data_17_projects.sql) | Seed demo org + **17 projects** + briefs, risks, finance, etc. |

## Demo logins (after sample data)

| Email | Password | Access |
|-------|----------|--------|
| `demo@iprojectx.com` | `demo1234` | Org owner + **Platform Admin** |
| `exec@iprojectx.com` | `demo1234` | Executive (read-only) |

Sample tenant: **Acme Digital** (`acme-digital`) with 17 projects (`PRJ-001` … `PRJ-017`).

## Connection strings

Supabase → **Project Settings → Database**

```env
DATABASE_URL="postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
AUTH_SECRET="replace-with-long-random-secret"
NEXT_PUBLIC_APP_NAME="iProjectX"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Point the app at Supabase

In `platform/prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

```bash
cd platform
npx prisma generate
npm run dev
```

If you already loaded `sample_data_17_projects.sql`, you do **not** need `npm run db:seed`.

## Re-run sample data

`sample_data_17_projects.sql` deletes and recreates the `org_acme_demo` tenant, so it is safe to re-run.
