import { defineEventHandler, getHeader, readRawBody, createError } from "h3";
import { getStripe } from "../../src/lib/stripe";
import { getStripeWebhookSecret } from "../../src/lib/env";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "../../src/lib/env";

export default defineEventHandler(async (event) => {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    throw createError({ statusCode: 500, statusMessage: "STRIPE_WEBHOOK_SECRET is not set" });
  }

  const signature = getHeader(event, "stripe-signature");
  if (!signature) {
    throw createError({ statusCode: 400, statusMessage: "Missing stripe-signature" });
  }

  const rawBody = await readRawBody(event);
  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: "Missing body" });
  }

  const stripe = getStripe();
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    throw createError({ statusCode: 400, statusMessage: message });
  }

  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!supabaseUrl || !serviceKey) {
    throw createError({ statusCode: 500, statusMessage: "Supabase admin env missing" });
  }
  const admin = createClient(supabaseUrl, serviceKey);

  if (
    stripeEvent.type === "checkout.session.completed" ||
    stripeEvent.type === "customer.subscription.updated" ||
    stripeEvent.type === "customer.subscription.created"
  ) {
    const obj = stripeEvent.data.object as {
      metadata?: { org_id?: string; plan?: string };
      client_reference_id?: string | null;
      customer?: string | null;
      status?: string;
    };
    const orgId = obj.metadata?.org_id || obj.client_reference_id || null;
    const plan = obj.metadata?.plan || "team";
    if (orgId) {
      await admin
        .from("organizations")
        .update({
          plan,
          stripe_customer_id: typeof obj.customer === "string" ? obj.customer : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);
    }
  }

  if (stripeEvent.type === "customer.subscription.deleted") {
    const obj = stripeEvent.data.object as {
      metadata?: { org_id?: string };
      customer?: string | null;
    };
    const orgId = obj.metadata?.org_id;
    if (orgId) {
      await admin.from("organizations").update({ plan: "free" }).eq("id", orgId);
    }
  }

  return { received: true };
});
