# iProjectX

Enterprise project management and delivery SaaS (Next.js + Supabase).

## Vercel (use `i-project-x-fozw`)

- **Root Directory:** empty (repo root)
- **Framework:** Next.js
- **Output Directory:** empty
- Delete the old **`i-project-x`** project if you still have it

Full checklist: [`VERCEL.md`](VERCEL.md)

## Local development

```bash
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
