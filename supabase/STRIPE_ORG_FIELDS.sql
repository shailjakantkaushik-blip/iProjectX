-- Run in Supabase SQL Editor after deploying the new app
-- Adds Stripe customer/subscription columns used by /api/stripe/webhook

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS organizations_stripe_customer_id_idx
  ON public.organizations (stripe_customer_id);
