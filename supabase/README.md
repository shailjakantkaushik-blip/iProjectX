# Supabase setup for iProjectX

## 1) Create the database

1. Open your Supabase project → **SQL Editor**
2. Copy the entire contents of [`schema.sql`](./schema.sql)
3. Paste and **Run**

## 2) Get connection strings

Supabase → **Project Settings → Database**

Use:

- **Transaction pooler** URI → `DATABASE_URL` (port `6543`, add `?pgbouncer=true`)
- **Direct** URI → `DIRECT_URL` (port `5432`) for migrations

Example `platform/.env`:

```env
DATABASE_URL="postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
AUTH_SECRET="replace-with-long-random-secret"
NEXT_PUBLIC_APP_NAME="iProjectX"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 3) Point Prisma at Postgres

In `platform/prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Then:

```bash
cd platform
npx prisma generate
npm run db:seed
npm run dev
```

> If tables already exist from `schema.sql`, do **not** re-run `prisma migrate dev` against an empty history — either baseline migrations or keep using the SQL file as source of truth and `db pull`/`generate`.

## 4) Demo logins (after seed)

| Email | Password | Access |
|-------|----------|--------|
| `demo@iprojectx.com` | `demo1234` | Org owner + **Platform Admin** |
| `exec@iprojectx.com` | `demo1234` | Executive (read-only) |

Platform Admin (`/app/admin`) controls landing page copy, colors, and global Excel/PPT/PDF feature flags.
