# Supabase setup for iProjectX

## Run SQL (copy / paste / Run in SQL Editor)

| Step | File | Purpose |
|------|------|---------|
| 1 | [`schema.sql`](./schema.sql) | App tables (includes Invoice + Streamlit parity models) |
| 2 | [`sample_data_17_projects.sql`](./sample_data_17_projects.sql) | 17 projects + Supabase Auth demo users |
| 3 | [`streamlit_parity_full.sql`](./streamlit_parity_full.sql) | **Existing DBs** — Dependency, Benefit, FYAllocation, PhaseFinancials, Movements, Config, etc. |

If the DB already existed before invoicing / Streamlit parity, run `stripe_invoices.sql` and/or `streamlit_parity_full.sql`.

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

### If login says invalid credentials

1. Supabase → **Authentication → Providers → Email** → turn **Confirm email OFF**
2. Run [`fix_demo_password.sql`](./fix_demo_password.sql) in the SQL Editor  
   (resets both demo passwords to `demo1234` with a GoTrue-compatible hash)
3. Or with service role locally: `npm run env:pull && npm run demo:users`

Also disable **Leaked password protection** temporarily if Supabase rejects `demo1234`.
