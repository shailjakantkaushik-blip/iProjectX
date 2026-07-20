-- ============================================================================
-- iProjectX — Supabase schema (copy, paste, run in SQL Editor)
-- ============================================================================
-- After running:
-- 1. Project Settings → Database → copy connection string (URI)
-- 2. Set in platform/.env:
--      DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
--      DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
-- 3. In prisma/schema.prisma set provider = "postgresql"
-- 4. cd platform && npx prisma db pull && npx prisma generate && npm run db:seed
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

-- ---------- catalog ----------
create table if not exists "Plan" (
  id              text primary key default gen_random_uuid()::text,
  slug            text not null unique,
  name            text not null,
  description     text not null,
  "monthlyPrice"  integer not null,
  "annualPrice"   integer not null,
  "seatLimit"     integer not null,
  "projectLimit"  integer not null,
  features        text not null default '[]',
  "isEnterprise"  boolean not null default false,
  "sortOrder"     integer not null default 0,
  "createdAt"     timestamptz not null default now()
);

-- ---------- platform owner site config (landing page, global toggles) ----------
create table if not exists "SiteConfig" (
  id                   text primary key default 'default',
  "brandName"          text not null default 'iProjectX',
  "heroTitle"          text not null default 'The enterprise platform for portfolio, delivery, and outcomes.',
  "heroSubtitle"       text not null default 'Move from spreadsheet PMO tooling to a multi-tenant SaaS workspace with subscription seats, interactive delivery intelligence, and full white-label branding.',
  "heroCtaLabel"       text not null default 'Start 14-day trial',
  "heroCtaHref"        text not null default '/signup',
  "secondaryCtaLabel"  text not null default 'View plans',
  "secondaryCtaHref"   text not null default '/pricing',
  "primaryColor"       text not null default '#0F766E',
  "accentColor"        text not null default '#0284C7',
  "secondaryColor"     text not null default '#134E4A',
  "logoUrl"            text,
  "faviconUrl"         text,
  "supportEmail"       text,
  "footerText"         text not null default 'Enterprise project management & delivery',
  "showPricing"        boolean not null default true,
  "showSignup"         boolean not null default true,
  "enableExcelImport"  boolean not null default true,
  "enablePptExport"    boolean not null default true,
  "enablePdfExport"    boolean not null default true,
  "featureCardsJson"   text not null default '[]',
  "updatedAt"          timestamptz not null default now()
);

insert into "SiteConfig" (id) values ('default')
on conflict (id) do nothing;

-- ---------- identity ----------
create table if not exists "User" (
  id               text primary key default gen_random_uuid()::text,
  email            text not null unique,
  name             text not null,
  "passwordHash"   text not null,
  "avatarUrl"      text,
  "isPlatformAdmin" boolean not null default false,
  "createdAt"      timestamptz not null default now(),
  "updatedAt"      timestamptz not null default now()
);

create table if not exists "Organization" (
  id                     text primary key default gen_random_uuid()::text,
  name                   text not null,
  slug                   text not null unique,
  "planId"               text references "Plan"(id) on delete set null,
  "billingEmail"         text,
  "seatCount"            integer not null default 1,
  "subscriptionStatus"   text not null default 'trialing',
  "trialEndsAt"          timestamptz,
  "stripeCustomerId"     text,
  "stripeSubId"          text,
  "brandName"            text,
  "logoUrl"              text,
  "faviconUrl"           text,
  "primaryColor"         text not null default '#0F766E',
  "accentColor"          text not null default '#0EA5E9',
  "secondaryColor"       text not null default '#134E4A',
  "customDomain"         text unique,
  "supportEmail"         text,
  "loginTagline"         text,
  "hidePoweredBy"        boolean not null default false,
  "enableExcelImport"    boolean not null default true,
  "enablePptExport"      boolean not null default true,
  "enablePdfExport"      boolean not null default true,
  "createdAt"            timestamptz not null default now(),
  "updatedAt"            timestamptz not null default now()
);

create table if not exists "Membership" (
  id                 text primary key default gen_random_uuid()::text,
  "organizationId"   text not null references "Organization"(id) on delete cascade,
  "userId"           text not null references "User"(id) on delete cascade,
  role               text not null default 'pm',
  "businessUnits"    text not null default '[]',
  "createdAt"        timestamptz not null default now(),
  unique ("organizationId", "userId")
);

create table if not exists "Invitation" (
  id                 text primary key default gen_random_uuid()::text,
  "organizationId"   text not null references "Organization"(id) on delete cascade,
  email              text not null,
  role               text not null default 'pm',
  token              text not null unique,
  "invitedById"      text references "User"(id) on delete set null,
  "expiresAt"        timestamptz not null,
  "acceptedAt"       timestamptz,
  "createdAt"        timestamptz not null default now()
);

-- ---------- portfolio ----------
create table if not exists "Program" (
  id                 text primary key default gen_random_uuid()::text,
  "organizationId"   text not null references "Organization"(id) on delete cascade,
  name               text not null,
  owner              text,
  sponsor            text,
  budget             double precision not null default 0,
  forecast           double precision not null default 0,
  "startFy"          text,
  "endFy"            text,
  status             text not null default 'Active',
  "createdAt"        timestamptz not null default now(),
  "updatedAt"        timestamptz not null default now()
);
create index if not exists "Program_organizationId_idx" on "Program"("organizationId");

create table if not exists "Project" (
  id                    text primary key default gen_random_uuid()::text,
  "organizationId"      text not null references "Organization"(id) on delete cascade,
  code                  text not null,
  name                  text not null,
  "programId"           text references "Program"(id) on delete set null,
  theme                 text,
  "portfolioCategory"   text not null default 'Business Strategic',
  "businessUnit"        text,
  sponsor               text,
  "deliveryLead"        text,
  pm                    text,
  priority              text not null default 'Medium',
  "investmentType"      text,
  "deliveryMethod"      text not null default 'Waterfall',
  "fundingType"         text not null default 'CAPEX',
  "governanceChannel"   text not null default 'Channel A',
  "financialYear"       text,
  "startDate"           timestamptz,
  "endDate"             timestamptz,
  progress              double precision not null default 0,
  funding               double precision not null default 0,
  spend                 double precision not null default 0,
  forecast              double precision not null default 0,
  "benefitsTarget"      double precision not null default 0,
  "benefitsRealised"    double precision not null default 0,
  status                text not null default 'Active',
  rag                   text not null default 'Green',
  stage                 text not null default 'Discovery',
  description           text,
  "createdAt"           timestamptz not null default now(),
  "updatedAt"           timestamptz not null default now(),
  unique ("organizationId", code)
);
create index if not exists "Project_organizationId_idx" on "Project"("organizationId");

-- Business case / project brief (infographic)
create table if not exists "ProjectBrief" (
  id                      text primary key default gen_random_uuid()::text,
  "projectId"             text not null unique references "Project"(id) on delete cascade,
  "strategicAlignment"    text,
  "problemStatement"      text,
  "proposedSolution"      text,
  scope                   text,
  "outOfScope"            text,
  "fundingAsk"            double precision not null default 0,
  "expectedBenefits"      text,
  "keyRisks"              text,
  assumptions             text,
  "successMetrics"        text,
  "optionsConsidered"     text,
  recommendation          text,
  "stakeholderSummary"    text,
  "updatedAt"             timestamptz not null default now()
);

create table if not exists "StageGate" (
  id             text primary key default gen_random_uuid()::text,
  "projectId"    text not null references "Project"(id) on delete cascade,
  channel        text not null,
  stage          text not null,
  "nextGate"     text,
  "gateStatus"   text not null default 'Pending',
  "plannedDate"  timestamptz,
  "actualDate"   timestamptz,
  outcome        text,
  "checklistPct" double precision not null default 0,
  "daysLate"     integer not null default 0
);

create table if not exists "Milestone" (
  id              text primary key default gen_random_uuid()::text,
  "projectId"     text not null references "Project"(id) on delete cascade,
  name            text not null,
  "plannedDate"   timestamptz,
  "forecastDate"  timestamptz,
  "actualDate"    timestamptz,
  status          text not null default 'Planned',
  owner           text
);

create table if not exists "FinancialMonth" (
  id          text primary key default gen_random_uuid()::text,
  "projectId" text not null references "Project"(id) on delete cascade,
  month       text not null,
  year        integer not null,
  capex       double precision not null default 0,
  opex        double precision not null default 0,
  actual      double precision not null default 0,
  forecast    double precision not null default 0,
  variance    double precision not null default 0,
  pv          double precision not null default 0,
  ev          double precision not null default 0
);

create table if not exists "Risk" (
  id                 text primary key default gen_random_uuid()::text,
  "organizationId"   text not null references "Organization"(id) on delete cascade,
  "projectId"        text references "Project"(id) on delete set null,
  code               text not null,
  title              text not null,
  description        text,
  probability        integer not null default 3,
  impact             integer not null default 3,
  velocity           integer not null default 2,
  owner              text,
  mitigation         text,
  status             text not null default 'Open',
  rag                text not null default 'Amber',
  "createdAt"        timestamptz not null default now(),
  "updatedAt"        timestamptz not null default now()
);
create index if not exists "Risk_organizationId_idx" on "Risk"("organizationId");

create table if not exists "Decision" (
  id                 text primary key default gen_random_uuid()::text,
  "organizationId"   text not null references "Organization"(id) on delete cascade,
  "projectId"        text references "Project"(id) on delete set null,
  title              text not null,
  description        text,
  owner              text,
  "decidedOn"        timestamptz,
  outcome            text,
  status             text not null default 'Pending',
  "createdAt"        timestamptz not null default now()
);

create table if not exists "Action" (
  id                 text primary key default gen_random_uuid()::text,
  "organizationId"   text not null references "Organization"(id) on delete cascade,
  "projectId"        text references "Project"(id) on delete set null,
  title              text not null,
  owner              text,
  "dueDate"          timestamptz,
  priority           text not null default 'Medium',
  status             text not null default 'Open',
  "createdAt"        timestamptz not null default now()
);

create table if not exists "PipelineItem" (
  id                      text primary key default gen_random_uuid()::text,
  "organizationId"        text not null references "Organization"(id) on delete cascade,
  code                    text not null,
  title                   text not null,
  "businessUnit"          text,
  "strategicAlignment"    integer not null default 3,
  "benefitValue"          integer not null default 3,
  "riskReduction"         integer not null default 2,
  compliance              integer not null default 2,
  complexity              integer not null default 3,
  "priorityScore"         double precision not null default 0,
  "estBudget"             double precision not null default 0,
  decision                text not null default 'Under Review',
  sponsor                 text,
  "createdAt"             timestamptz not null default now()
);
create index if not exists "PipelineItem_organizationId_idx" on "PipelineItem"("organizationId");

create table if not exists "Resource" (
  id                 text primary key default gen_random_uuid()::text,
  "organizationId"   text not null references "Organization"(id) on delete cascade,
  "projectId"        text references "Project"(id) on delete set null,
  name               text not null,
  skill              text,
  role               text,
  month              text,
  "allocationPct"    double precision not null default 0,
  "capacityPct"      double precision not null default 100
);

create table if not exists "Sprint" (
  id                 text primary key default gen_random_uuid()::text,
  "organizationId"   text not null references "Organization"(id) on delete cascade,
  "projectId"        text references "Project"(id) on delete set null,
  name               text not null,
  "startDate"        timestamptz,
  "endDate"          timestamptz,
  "committedPts"     integer not null default 0,
  "completedPts"     integer not null default 0,
  status             text not null default 'Planned'
);

create table if not exists "Release" (
  id                 text primary key default gen_random_uuid()::text,
  "organizationId"   text not null references "Organization"(id) on delete cascade,
  "projectId"        text references "Project"(id) on delete set null,
  version            text not null,
  title              text not null,
  "releaseType"      text not null default 'Minor',
  environment        text not null default 'Production',
  "plannedDate"      timestamptz,
  "actualDate"       timestamptz,
  status             text not null default 'Planned'
);

create table if not exists "Update" (
  id                 text primary key default gen_random_uuid()::text,
  "organizationId"   text not null references "Organization"(id) on delete cascade,
  title              text not null,
  body               text not null,
  category           text not null default 'General',
  "createdAt"        timestamptz not null default now()
);

-- Import audit log
create table if not exists "ImportJob" (
  id                 text primary key default gen_random_uuid()::text,
  "organizationId"   text not null references "Organization"(id) on delete cascade,
  "userId"           text references "User"(id) on delete set null,
  filename           text not null,
  status             text not null default 'completed',
  "rowsUpserted"     integer not null default 0,
  "errorCount"       integer not null default 0,
  summary            text,
  "createdAt"        timestamptz not null default now()
);

-- ---------- updatedAt triggers ----------
drop trigger if exists user_updated_at on "User";
create trigger user_updated_at before update on "User"
for each row execute function public.set_updated_at();

drop trigger if exists org_updated_at on "Organization";
create trigger org_updated_at before update on "Organization"
for each row execute function public.set_updated_at();

drop trigger if exists program_updated_at on "Program";
create trigger program_updated_at before update on "Program"
for each row execute function public.set_updated_at();

drop trigger if exists project_updated_at on "Project";
create trigger project_updated_at before update on "Project"
for each row execute function public.set_updated_at();

drop trigger if exists risk_updated_at on "Risk";
create trigger risk_updated_at before update on "Risk"
for each row execute function public.set_updated_at();

drop trigger if exists brief_updated_at on "ProjectBrief";
create trigger brief_updated_at before update on "ProjectBrief"
for each row execute function public.set_updated_at();

drop trigger if exists site_updated_at on "SiteConfig";
create trigger site_updated_at before update on "SiteConfig"
for each row execute function public.set_updated_at();

-- ---------- seed plans ----------
insert into "Plan" (id, slug, name, description, "monthlyPrice", "annualPrice", "seatLimit", "projectLimit", features, "isEnterprise", "sortOrder")
values
  ('plan_starter', 'starter', 'Starter', 'For small PMO teams getting portfolio visibility.', 4900, 49000, 10, 25,
   '["Executive dashboard","Projects & programs","Risk & RAID tracking","Demand pipeline","Basic reporting","Email support"]', false, 1),
  ('plan_pro', 'professional', 'Professional', 'Full delivery control for growing enterprises.', 14900, 149000, 50, 200,
   '["Everything in Starter","Stage-gate governance","EVM financials & FY allocation","Resource capacity planning","Agile sprints & releases","White-label branding","Priority support"]', false, 2),
  ('plan_ent', 'enterprise', 'Enterprise', 'Unlimited scale with SSO-ready white-label delivery.', 39900, 399000, 500, 5000,
   '["Everything in Professional","Custom domain white-label","Hide powered-by branding","Advanced seat governance","Dedicated success manager","SSO / SAML ready hooks","Audit-friendly exports"]', true, 3)
on conflict (slug) do nothing;

-- ---------- RLS (optional hardening; app also enforces org scope) ----------
alter table "Organization" enable row level security;
alter table "Project" enable row level security;
alter table "Program" enable row level security;
alter table "Risk" enable row level security;
alter table "Decision" enable row level security;
alter table "Action" enable row level security;
alter table "PipelineItem" enable row level security;
alter table "Resource" enable row level security;
alter table "Sprint" enable row level security;
alter table "Release" enable row level security;
alter table "Update" enable row level security;
alter table "ImportJob" enable row level security;
alter table "ProjectBrief" enable row level security;

-- Service-role / server app uses Prisma with the DB password and bypasses RLS.
-- If you later use Supabase Auth + anon key from the browser, add policies keyed on auth.uid().

comment on table "SiteConfig" is 'Platform-owner configurable landing page and global feature flags';
comment on table "ProjectBrief" is 'Business case content for project infographic and exports';
