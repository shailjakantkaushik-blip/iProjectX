# iProjectX Platform

Multi-tenant SaaS for enterprise project management and delivery.

The Next.js app lives at the **repository root**. Legacy Streamlit + Excel code is under `legacy/`.

## Quick start

```bash
npm install
cp .env.example .env
# fill DATABASE_URL + NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo (after SQL seed): `demo@iprojectx.com` / `demo1234`

## Deploy on Vercel

Use project **`i-project-x-fozw`** with Root Directory **empty**. See `VERCEL.md`.
