# Vercel deployment

The Next.js app is at the **repository root**.

## Root Directory

In Vercel → Settings → General → **Root Directory**:

- Leave **empty** / default (`.`)
- Do **not** set `platform` anymore (that folder was removed)

Then **Redeploy**.

## Framework

- Framework Preset: **Next.js**
- Output Directory: **leave empty**
- Build Command: default (`npx prisma generate && next build` via `vercel.json` / package.json)

## Environment variables

Settings → Environment Variables (Production + Preview):

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`

## Verify

```bash
curl https://YOUR_APP.vercel.app/api/health
```

You should see `"ok": true` (once env vars are set), and `/` / `/login` should load.
