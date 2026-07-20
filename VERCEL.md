# Vercel deployment (`i-project-x-fozw`)

The Next.js app is at the **repository root**.

Use project **`i-project-x-fozw`**. You can delete **`i-project-x`**.

## Required settings

Vercel → **i-project-x-fozw** → Settings → General:

| Setting | Value |
|--------|--------|
| **Root Directory** | **empty** (Edit → Clear) |
| **Framework Preset** | `Next.js` |
| **Build Command** | default |
| **Output Directory** | **EMPTY** (Reset if set) |
| **Install Command** | default |

Redeploy with **Use existing Build Cache** unchecked.

Wrong **Output Directory** (e.g. `public`) causes `404: NOT_FOUND` even when the deploy “succeeds”.

## Domains

Settings → Domains → ensure `i-project-x-fozw.vercel.app` is on **Production**.

## Deployment Protection

Settings → Deployment Protection → Production = **None** while testing (otherwise URLs redirect to Vercel login).

## Environment variables

Production + Preview:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`

## Verify

1. Deployments → latest Production → **Visit**
2. `/` loads the landing page
3. `/api/health` returns JSON
