# Migration: Streamlit Excel PMO → iProjectX SaaS

## What existed

A single-tenant Streamlit application backed by `data/PMO_Master.xlsx` with:

- Executive / portfolio / delivery / financials / governance hubs
- Local JSON user auth and file-locked Excel writes
- Theme picker and PowerPoint export
- Desktop/`RUN.bat` hosting model

## What we built

`platform/` is a multi-tenant web SaaS product:

| Capability | Legacy | New platform |
|---|---|---|
| Runtime | Streamlit local process | Next.js web app |
| Data | Excel workbook | Prisma ORM + SQLite/Postgres |
| Tenancy | Single shared file | Organization workspaces |
| Billing | None | Seat-based Starter / Pro / Enterprise |
| Branding | Hardcoded + theme colors | Full white-label per tenant |
| Auth | Local users.json | Cookie JWT + org memberships |
| UI | Streamlit widgets | Interactive React dashboards |

## Domain continuity

Core PMO entities were preserved:

Projects, Programs, StageGates, Milestones, FinancialMonths, Risks, Decisions, Actions, Pipeline, Resources, Sprints, Releases, Updates.

## Suggested next upgrades

1. Swap SQLite → Postgres for production
2. Stripe checkout webhooks for live billing
3. Custom-domain TLS provisioning for Enterprise white-label
4. SSO (SAML/OIDC) for Enterprise
5. Excel import wizard from `PMO_Master.xlsx`
6. Realtime collaboration + audit log
