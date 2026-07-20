import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/env";

let _stripe: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(getStripeSecretKey());
}

export function getStripe() {
  const key = getStripeSecretKey();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set in Vercel environment variables.");
  }
  if (!_stripe) {
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export function getStripePriceId(plan: "team" | "business"): string | undefined {
  const map = {
    team: process.env.STRIPE_PRICE_TEAM,
    business: process.env.STRIPE_PRICE_BUSINESS,
  } as const;
  const id = map[plan];
  return id && id.trim() ? id.trim() : undefined;
}
