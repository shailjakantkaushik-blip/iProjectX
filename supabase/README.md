# Supabase setup for iProjectX

## Run SQL (copy / paste / Run in SQL Editor)

| Step | File | Purpose |
|------|------|---------|
| 1 | [`schema.sql`](./schema.sql) | App tables (includes `Invoice` for Stripe billing) |
| 2 | [`sample_data_17_projects.sql`](./sample_data_17_projects.sql) | 17 projects + Supabase Auth demo users |

If the DB already existed before invoicing was added, re-run `schema.sql` (safe `create table if not exists`) or at least the `"Invoice"` block.

## App environment (Vercel or local `.env.local`)

```env
DATABASE_URL="postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

NEXT_PUBLIC_APP_NAME="iProjectX"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Prefer setting these in **Vercel → Environment Variables**.

## Auth (demo)

**Authentication → Providers → Email** → turn **Confirm email** OFF for easy demo login.

## App

```bash
npm install
npx prisma generate
npm run dev
```

## Demo logins

| Email | Password | Access |
|-------|----------|--------|
| `demo@iprojectx.com` | `demo1234` | Owner + Platform Admin |
| `exec@iprojectx.com` | `demo1234` | Executive |
