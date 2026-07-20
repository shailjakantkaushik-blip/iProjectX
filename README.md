# iProjectX

Enterprise project management and delivery SaaS (Next.js + Supabase).

## Vercel

**Root Directory:** `platform`

1. Vercel → Project → Settings → General → **Root Directory** → set to `platform`
2. Framework Preset: **Next.js**
3. Output Directory: leave empty
4. Redeploy (clear cache)

Env vars: see [`platform/VERCEL.md`](platform/VERCEL.md) and [`platform/.env.example`](platform/.env.example).

## Local development

```bash
cd platform
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Demo (after Supabase sample SQL): `demo@iprojectx.com` / `demo1234`

## Supabase

1. [`supabase/schema.sql`](supabase/schema.sql)
2. [`supabase/sample_data_17_projects.sql`](supabase/sample_data_17_projects.sql)

## Legacy Streamlit app

See [`legacy/`](legacy/).
