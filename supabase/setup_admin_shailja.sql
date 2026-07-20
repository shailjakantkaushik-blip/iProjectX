-- ============================================================================
-- Create Platform Admin: shailja.kant.kaushik@gmail.com
-- IMPORTANT: create the Auth user in the Dashboard first (see notes below),
-- then run this SQL to attach the app profile + admin rights.
-- ============================================================================
-- Dashboard steps (do this BEFORE running SQL):
--   1) Authentication → Users → Add user
--   2) Email: shailja.kant.kaushik@gmail.com
--   3) Password: demo@1234
--   4) Auto Confirm User: ON
--   5) Click Create user
-- ============================================================================

create extension if not exists "pgcrypto";

-- Ensure User columns exist
alter table "User" add column if not exists "authUserId" text;
alter table "User" add column if not exists "avatarUrl" text;
alter table "User" add column if not exists "isPlatformAdmin" boolean default false;
alter table "User" add column if not exists "passwordHash" text;
alter table "User" add column if not exists "createdAt" timestamptz default now();
alter table "User" add column if not exists "updatedAt" timestamptz default now();

do $$ begin
  alter table "User" alter column "passwordHash" drop not null;
exception when others then null;
end $$;

do $$ begin
  create unique index if not exists "User_authUserId_key" on "User" ("authUserId");
exception when others then null;
end $$;

update "User" set "isPlatformAdmin" = coalesce("isPlatformAdmin", false);
alter table "User" alter column "isPlatformAdmin" set default false;
alter table "User" alter column "isPlatformAdmin" set not null;

-- Ensure Organization basics exist for membership
alter table "Organization" add column if not exists "billingEmail" text;
alter table "Organization" add column if not exists "seatCount" integer default 1;
alter table "Organization" add column if not exists "subscriptionStatus" text default 'trialing';
alter table "Organization" add column if not exists "stripeCustomerId" text;
alter table "Organization" add column if not exists "stripeSubId" text;

do $$
declare
  v_email text := 'shailja.kant.kaushik@gmail.com';
  v_auth_id uuid;
  v_user_id text;
  v_org_id text;
begin
  -- Find Auth user created via Dashboard
  select id into v_auth_id
  from auth.users
  where lower(email) = v_email
  order by created_at desc
  limit 1;

  if v_auth_id is null then
    raise exception
      'Auth user % not found. Create it first in Authentication → Users → Add user (password demo@1234, Auto Confirm ON).',
      v_email;
  end if;

  -- Confirm email
  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = v_auth_id;

  v_user_id := v_auth_id::text;

  -- Upsert app profile as platform admin
  insert into "User" (id, email, name, "authUserId", "passwordHash", "isPlatformAdmin")
  values (v_user_id, v_email, 'Shailja Kant Kaushik', v_user_id, null, true)
  on conflict (email) do update set
    id = excluded.id,
    "authUserId" = excluded."authUserId",
    name = excluded.name,
    "isPlatformAdmin" = true,
    "updatedAt" = now();

  -- Also handle conflict on id if email unique path differed
  update "User"
  set "authUserId" = v_user_id,
      "isPlatformAdmin" = true,
      email = v_email,
      "updatedAt" = now()
  where id = v_user_id or "authUserId" = v_user_id or email = v_email;

  -- Pick org: prefer sample Acme, else first org, else create one
  if exists (select 1 from "Organization" where id = 'org_acme_demo') then
    v_org_id := 'org_acme_demo';
  else
    select id into v_org_id from "Organization" order by "createdAt" nulls last limit 1;
  end if;

  if v_org_id is null then
    v_org_id := 'org_shailja';
    insert into "Organization" (id, name, slug, "billingEmail", "seatCount", "subscriptionStatus")
    values (v_org_id, 'Shailja Workspace', 'shailja-workspace', v_email, 25, 'active')
    on conflict (id) do nothing;
  end if;

  delete from "Membership" where "userId" = v_user_id;

  insert into "Membership" (id, "organizationId", "userId", role)
  values ('mem_shailja_' || substr(v_user_id, 1, 8), v_org_id, v_user_id, 'owner')
  on conflict ("organizationId", "userId") do update set role = 'owner';
end $$;

-- Verify
select id, email, email_confirmed_at is not null as confirmed
from auth.users
where lower(email) = 'shailja.kant.kaushik@gmail.com';

select u.email, u."isPlatformAdmin", u."authUserId", m.role, o.name as org
from "User" u
left join "Membership" m on m."userId" = u.id
left join "Organization" o on o.id = m."organizationId"
where u.email = 'shailja.kant.kaushik@gmail.com';
