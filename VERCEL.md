# Vercel — use `i-project-x` (working)

**Live URL:** https://i-project-x.vercel.app

Do **not** use `i-project-x-fozw`. Its production domain returns `404: NOT_FOUND`. Delete that project in the Vercel dashboard.

## Confirmed working

| Check | Result |
|-------|--------|
| https://i-project-x.vercel.app/ | 200 — landing page |
| https://i-project-x.vercel.app/login | 200 |
| https://i-project-x.vercel.app/api/health | JSON health payload |

## Settings for `i-project-x`

Settings → General:

| Setting | Value |
|--------|--------|
| Root Directory | **empty** |
| Framework Preset | **Next.js** |
| Output Directory | **empty** |

## Add missing env vars (required for login/data)

Settings → Environment Variables (Production + Preview), then redeploy:

- `DATABASE_URL` (Supabase URI starting with `postgresql://…` — **not** `file:`)
  Prisma provider is **PostgreSQL**.
- `DIRECT_URL` (optional; direct 5432 URI if you run migrations locally)

### If login says “invalid port number”

Your database **password** likely contains `@`, `#`, `/`, `%`, etc. Those must be **URL-encoded** inside `DATABASE_URL` / `DIRECT_URL`.

| Character in password | Encode as |
|----------------------|-----------|
| `@` | `%40` |
| `#` | `%23` |
| `/` | `%2F` |
| `%` | `%25` |
| `:` | `%3A` |
| `?` | `%3F` |
| `&` | `%26` |
| ` ` (space) | `%20` |

Example — password `demo@1234`:

```text
postgresql://postgres.YOUR_REF:demo%401234@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Easiest path in Supabase:
1. Project Settings → Database → **Connection string** → URI  
2. Copy the pooled URI (and direct URI)  
3. Paste into Vercel `DATABASE_URL` / `DIRECT_URL` (Supabase already encodes the password when you use the copy button)  
4. Redeploy `i-project-x`

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_NAME` = `iProjectX`
- `NEXT_PUBLIC_APP_URL` = `https://i-project-x.vercel.app`
- `STRIPE_SECRET_KEY` (enterprise invoices)
- `STRIPE_WEBHOOK_SECRET` (payment confirmation)

See [`STRIPE.md`](STRIPE.md) for webhook endpoint setup.

## Cleanup

1. Open https://i-project-x.vercel.app
2. Vercel → delete project **`i-project-x-fozw`**
3. Disconnect that project from the GitHub repo if prompted
