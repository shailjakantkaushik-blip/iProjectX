# Migration notes (Streamlit → SaaS)

Legacy Streamlit + Excel PMO tooling lives in this `legacy/` folder.

The production product is the **Next.js SaaS at the repository root**.

## Mapping

| Legacy | SaaS |
|---|---|
| `PMO_Master.xlsx` | Postgres via Prisma / Supabase (`supabase/schema.sql`) |
| Streamlit pages | Next.js App Router modules under `/app/*` |
| Local Excel edits | Excel import/export API + Data & Exports UI |
| Single-user desktop feel | Multi-tenant orgs, seats, roles, white-label |

## Recommended path

1. Run `supabase/schema.sql` then `supabase/sample_data_17_projects.sql` in Supabase
2. Deploy on Vercel project `i-project-x-fozw` with Root Directory empty
3. Use Excel template download/upload for bulk data, not as system of record
