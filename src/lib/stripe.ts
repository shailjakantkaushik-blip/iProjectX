import Stripe from "stripe";
import { getEnv } from "./env";

export function getStripeSecretKey() {
  return (process.env.STRIPE_SECRET_KEY || "").trim();
}

export function getStripeWebhookSecret() {
  return (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
}

export function isStripeConfigured() {
  return Boolean(getStripeSecretKey());
}

let stripeSingleton: Stripe | null = null;

export function getStripe() {
  const key = getStripeSecretKey();
  if (!key) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in Vercel Environment Variables."
    );
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function appBillingReturnUrl() {
  const { appUrl } = getEnv();
  return `${appUrl.replace(/\/$/, "")}/app/settings`;
}
