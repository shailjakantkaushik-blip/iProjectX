# Vercel deployment (fix 404 NOT_FOUND)

## Why you see `404: NOT_FOUND` (Code: NOT_FOUND, ID: syd1::…)

This repo is a **monorepo**:

- Repo **root** = legacy Streamlit/Python app (no Next.js)
- **`platform/`** = the real Next.js SaaS app

If Vercel’s **Root Directory** is `.` (repo root), the deploy has nothing valid to serve → **404 NOT_FOUND**.

## Fix (required)

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → your project  
2. **Settings → General → Root Directory**  
3. Click **Edit** → set to:

   ```text
   platform
   ```

4. **Save**
5. **Settings → Build & Development Settings**
   - Framework Preset: **Next.js**
   - Build Command: leave default / `prisma generate && next build` (from `platform/package.json`)
   - Output Directory: **leave empty** (do not set `.next` manually)
6. **Deployments → … on latest → Redeploy** (or push a new commit)

## Environment variables

Still set these under **Settings → Environment Variables** (Production + Preview):

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL` (your `https://….vercel.app` URL)

Then redeploy.

## Verify

After a successful deploy:

```bash
curl https://YOUR_APP.vercel.app/api/health
```

Expect `"ok": true` and `"source": "vercel"`.

Home page `/` and `/login` should load (not the Vercel NOT_FOUND page).

## Local pull from Vercel

```bash
cd platform
npx vercel link
npm run env:pull
npm run dev
```
