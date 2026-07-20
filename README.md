# iProjectX

Enterprise project management and delivery SaaS (Next.js + Supabase).

## Vercel

**Root Directory:** `platform`  
**Output Directory:** must be **empty** (wrong output dir causes `404: NOT_FOUND`)  
**Framework:** Next.js

Full checklist: [`platform/VERCEL.md`](platform/VERCEL.md)

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
