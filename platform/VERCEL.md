# Vercel deployment

## Fix: `No Next.js version detected`

This means Vercel is **not** using the `platform/` folder (where `next` lives in `package.json`).

### Do this in the Vercel dashboard

1. Open your project → **Settings**
2. **General** → **Root Directory** → **Edit**
3. Set Root Directory to exactly:

   ```text
   platform
   ```

   (not `.`, not `/`, not blank)

4. **Save**
5. **Build and Deployment** → **Framework Preset** = **Next.js**
6. Clear any custom **Output Directory** (must be empty for Next.js)
7. **Deployments** → open latest → **Redeploy** → check “Use existing Build Cache” **off**

After this, the build log should show install/build running inside `platform/` and find `next@16.x`.

## Required env vars

**Settings → Environment Variables** (Production + Preview):

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

## Local

```bash
cd platform
npx vercel link
npm run env:pull
npm run dev
```
