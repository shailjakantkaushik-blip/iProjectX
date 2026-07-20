-- ============================================================================
-- Fix demo login passwords (run in Supabase SQL Editor)
-- Password for both users: demo1234
-- ============================================================================
-- Why: raw crypt()/gen_salt inserts often fail GoTrue password checks.
-- This sets a known-good bcrypt hash ($2a$ / cost 10) for demo1234.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Precomputed bcrypt for: demo1234
-- $2a$10$QnSkGSgN8anboiDyJ7rFCO1nQsM7rtPfyJ1Q4EpKH4yA7HIZDm60O

update auth.users
set
  encrypted_password = '$2a$10$QnSkGSgN8anboiDyJ7rFCO1nQsM7rtPfyJ1Q4EpKH4yA7HIZDm60O',
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now(),
  confirmation_token = '',
  recovery_token = '',
  email_change = '',
  email_change_token_new = ''
where email in ('demo@iprojectx.com', 'exec@iprojectx.com')
   or id in (
     '11111111-1111-4111-8111-111111111111'::uuid,
     '22222222-2222-4222-8222-222222222222'::uuid
   );

-- Ensure identities exist (required for email login)
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.id::text,
  now(), now(), now()
from auth.users u
where u.email in ('demo@iprojectx.com', 'exec@iprojectx.com')
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

-- Quick check
select id, email, email_confirmed_at is not null as confirmed,
       left(encrypted_password, 7) as hash_prefix
from auth.users
where email in ('demo@iprojectx.com', 'exec@iprojectx.com');
