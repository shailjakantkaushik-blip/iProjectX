# iProjectX

Enterprise project management and delivery SaaS (Next.js + Supabase).

## Live site

**https://i-project-x.vercel.app**

Use Vercel project **`i-project-x`**. Delete **`i-project-x-fozw`** (broken production domain).

Deploy settings: [`VERCEL.md`](VERCEL.md)  
Enterprise invoicing (Stripe): [`STRIPE.md`](STRIPE.md)

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
3. Existing DBs: run [`supabase/streamlit_parity_full.sql`](supabase/streamlit_parity_full.sql)

Stripe billing remains under Workspace Settings + Platform Admin.

## Legacy Streamlit app

See [`legacy/`](legacy/). The Next.js app mirrors the Streamlit 5-hub PMO with Plotly visualisations and SaaS billing.
