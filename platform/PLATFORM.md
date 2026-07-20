# iProjectX Platform

Multi-tenant SaaS for enterprise project management and delivery.

The Next.js app lives in **`platform/`**. Legacy Streamlit + Excel code is under `legacy/`.

## Quick start

```bash
cd platform
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

1. Import this GitHub repo
2. **Root Directory** = `platform`
3. Framework = Next.js
4. Add env vars (see `VERCEL.md` and `.env.example`)
5. Deploy

See `VERCEL.md` for the full checklist.
