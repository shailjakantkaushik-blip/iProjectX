# Supabase setup for iProjectX

## Run SQL (copy / paste / Run in SQL Editor)

| Step | File | Purpose |
|------|------|---------|
| 1 | [`schema.sql`](./schema.sql) | App tables |
| 2 | [`sample_data_17_projects.sql`](./sample_data_17_projects.sql) | 17 projects + **Supabase Auth** demo users |

## App environment (`platform/.env`)

```env
DATABASE_URL="postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

NEXT_PUBLIC_APP_NAME="iProjectX"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Keys: **Supabase → Project Settings → API**  
DB URIs: **Project Settings → Database**

## Auth settings (recommended for demo)

**Authentication → Providers → Email**

- Enable Email provider  
- For local/demo: turn **Confirm email** **OFF** so signup/login works immediately  

## Prisma

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

## Demo logins

| Email | Password | Access |
|-------|----------|--------|
| `demo@iprojectx.com` | `demo1234` | Owner + Platform Admin |
| `exec@iprojectx.com` | `demo1234` | Executive |

Auth is handled by **Supabase Auth**. App tables store org membership / RBAC only (no `AUTH_SECRET` cookie sessions).
