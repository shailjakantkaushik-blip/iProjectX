-- ============================================================================
-- iProjectX — Stripe / enterprise invoicing schema
-- Copy, paste, Run in Supabase SQL Editor
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ============================================================================

create extension if not exists "pgcrypto";

-- updated_at helper (no-op if already present from schema.sql)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

-- Ensure Organization has Stripe customer/subscription placeholders
alter table "Organization" add column if not exists "stripeCustomerId" text;
alter table "Organization" add column if not exists "stripeSubId" text;
alter table "Organization" add column if not exists "billingEmail" text;
alter table "Organization" add column if not exists "subscriptionStatus" text;
alter table "Organization" add column if not exists "seatCount" integer;
alter table "Organization" add column if not exists "trialEndsAt" timestamptz;

-- Defaults for existing rows if columns were just added empty
update "Organization" set "subscriptionStatus" = coalesce("subscriptionStatus", 'trialing');
update "Organization" set "seatCount" = coalesce("seatCount", 1);

-- Invoice table (Stripe send_invoice + webhook confirmation)
create table if not exists "Invoice" (
  id                   text primary key default gen_random_uuid()::text,
  "organizationId"     text not null references "Organization"(id) on delete cascade,
  "stripeInvoiceId"    text unique,
  "stripeCustomerId"   text,
  number               text,
  status               text not null default 'draft',
  "amountDue"          integer not null default 0,
  "amountPaid"         integer not null default 0,
  currency             text not null default 'usd',
  description          text,
  "planSlug"           text,
  "seatCount"          integer,
  interval             text,
  "hostedInvoiceUrl"   text,
  "invoicePdf"         text,
  "dueDate"            timestamptz,
  "paidAt"             timestamptz,
  "createdByUserId"    text,
  "createdAt"          timestamptz not null default now(),
  "updatedAt"          timestamptz not null default now()
);

create index if not exists "Invoice_organizationId_idx" on "Invoice" ("organizationId");
create index if not exists "Invoice_status_idx" on "Invoice" (status);

drop trigger if exists invoice_set_updated_at on "Invoice";
create trigger invoice_set_updated_at
before update on "Invoice"
for each row execute function public.set_updated_at();

-- Verify
select
  'Invoice' as table_name,
  count(*)::int as row_count
from "Invoice";

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'Invoice'
order by ordinal_position;
