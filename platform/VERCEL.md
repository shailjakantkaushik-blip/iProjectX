# Vercel deployment

The Next.js app lives in **`platform/`**.

## Required project settings

Vercel → Project → **Settings → General**:

| Setting | Value |
|--------|--------|
| **Root Directory** | `platform` |
| **Framework Preset** | `Next.js` |
| **Build Command** | leave default (do not override) |
| **Output Directory** | **EMPTY** (must not be `public`, `.next`, or anything else) |
| **Install Command** | leave default |

Then **Deployments → … → Redeploy** with **Use existing Build Cache** unchecked.

If **Output Directory** is set, Vercel serves static files only and `/` returns `404: NOT_FOUND` even when the GitHub check says “Deployment has completed”.

## Domains

Settings → **Domains**:

- Ensure `YOUR_PROJECT.vercel.app` is listed and assigned to **Production**
- Open the latest **Production** deployment from the Deployments tab (not only the `*.vercel.app` alias) if the alias 404s

## Deployment Protection

If deployment URLs redirect to a Vercel login page:

Settings → **Deployment Protection** → for Production, set to **None** (or Standard only for Preview) while testing.

## Environment variables

Production + Preview:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`

## Duplicate projects

This repo is currently linked to two Vercel projects (`i-project-x` and `i-project-x-fozw`). Keep **one**, delete or disconnect the other, and use that project’s Production URL.

## Verify

1. GitHub commit shows **Vercel – … Deployment has completed**
2. In Vercel → Deployments → open the Production deployment URL
3. `/` loads the landing page
4. `/api/health` returns JSON
