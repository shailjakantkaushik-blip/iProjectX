# Vercel deployment

The Next.js app lives in the **`platform/`** folder.

## Root Directory (required)

In Vercel → Settings → General → **Root Directory**:

- Set to: `platform`
- Framework Preset: **Next.js**
- Output Directory: **leave empty**

Then **Redeploy** (uncheck “Use existing Build Cache” if the last deploy failed).

If Root Directory is empty or wrong, Vercel shows `404: NOT_FOUND`.

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

You should see JSON with `"ok": true` once env vars are set. `/` and `/login` should load.
