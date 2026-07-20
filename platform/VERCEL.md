# Vercel environment setup

## How env vars work (important)

You do **not** fetch secrets from the Vercel API inside the app.

1. Set variables in **Vercel → Project → Settings → Environment Variables**
2. On deploy, Vercel injects them into `process.env`
3. App code reads `process.env` via `src/lib/env.ts`

That is the supported, secure path.

## Variables to add in Vercel

| Name | Environment | Notes |
|------|-------------|-------|
| `DATABASE_URL` | Production, Preview | Supabase pooler URI (`?pgbouncer=true`) |
| `DIRECT_URL` | Production, Preview | Supabase direct URI (migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Server-only; never expose to browser |
| `NEXT_PUBLIC_APP_NAME` | Production, Preview | e.g. `iProjectX` |
| `NEXT_PUBLIC_APP_URL` | Production, Preview | Your Vercel URL |

Leave secrets **out of Git**. Only `.env.example` stays in the repo.

## Local development (pull from Vercel)

```bash
cd platform
npx vercel login
npx vercel link          # once — connects this folder to the Vercel project
npm run env:pull         # writes gitignored .env.local from Vercel
npm run dev
```

`npm run env:pull` runs `vercel env pull .env.local`.

## Verify

After deploy (or locally with `.env.local`):

```bash
curl https://YOUR_APP.vercel.app/api/health
```

You should see `"ok": true` and `"source": "vercel"` on Vercel.
