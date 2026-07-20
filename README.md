# iProjectX

Enterprise project management and delivery SaaS (Next.js + Supabase).

## Vercel

**Root Directory:** leave as **`.`** (repo root) — the Next.js app is now at the root.

Set env vars in Vercel → Settings → Environment Variables. See [`VERCEL.md`](VERCEL.md).

## Local development

```bash
npm install
npx prisma migrate dev   # or use Supabase SQL
npm run db:seed          # optional local seed
npm run dev
```

If using Vercel env sync:

```bash
npx vercel link
npm run env:pull
npm run dev
```

Demo (after Supabase sample SQL): `demo@iprojectx.com` / `demo1234`

## Supabase

Run in SQL Editor (order matters):

1. [`supabase/schema.sql`](supabase/schema.sql)
2. [`supabase/sample_data_17_projects.sql`](supabase/sample_data_17_projects.sql)

Setup: [`supabase/README.md`](supabase/README.md)

## Legacy Streamlit app

The original Excel/Streamlit tool is in [`legacy/`](legacy/).
