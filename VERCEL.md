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

- `DATABASE_URL`
- `DIRECT_URL`
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
