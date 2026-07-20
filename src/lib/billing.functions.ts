import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAppUrl, getServiceStatus } from "@/lib/env";
import { getStripe, getStripePriceId, isStripeConfigured } from "@/lib/stripe";
import { isR2Configured } from "@/lib/cloudflare-r2";

export const getIntegrationsStatus = createServerFn({ method: "GET" }).handler(async () => {
  const status = getServiceStatus();
  return {
    ...status,
    cloudflareR2: isR2Configured(),
    stripe: isStripeConfigured(),
  };
});

const checkoutSchema = z.object({
  plan: z.enum(["team", "business"]),
  orgId: z.string().uuid(),
  customerEmail: z.string().email().optional(),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .validator(checkoutSchema)
  .handler(async ({ data }) => {
    if (!isStripeConfigured()) {
      throw new Error(
        "Stripe is not configured. Set STRIPE_SECRET_KEY (and STRIPE_PRICE_TEAM / STRIPE_PRICE_BUSINESS) in Vercel.",
      );
    }
    const priceId = getStripePriceId(data.plan);
    if (!priceId) {
      throw new Error(
        `Missing price id for plan '${data.plan}'. Set STRIPE_PRICE_${data.plan.toUpperCase()} in Vercel.`,
      );
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app/billing?checkout=success`,
      cancel_url: `${appUrl}/app/billing?checkout=cancel`,
      customer_email: data.customerEmail || undefined,
      client_reference_id: data.orgId,
      metadata: {
        org_id: data.orgId,
        plan: data.plan,
      },
      subscription_data: {
        metadata: {
          org_id: data.orgId,
          plan: data.plan,
        },
      },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url, sessionId: session.id };
  });
