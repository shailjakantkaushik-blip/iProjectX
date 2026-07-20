# Prisma migrations

Production schema is applied via Supabase SQL:

1. `supabase/schema.sql`
2. `supabase/stripe_invoices.sql` (if needed)
3. Sample data / admin setup scripts as required

This app uses **PostgreSQL (Supabase)**. Older SQLite migration history is kept under `prisma/migrations_sqlite_archive/` for reference only — do not run it against Supabase.

For local/dev schema sync against Supabase:

```bash
npx prisma db pull   # optional
npx prisma generate
```
