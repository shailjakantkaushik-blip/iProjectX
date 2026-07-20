import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { applyPaidInvoice, syncInvoiceStatus } from "@/lib/billing";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "invoice.paid": {
        await applyPaidInvoice(event.data.object as Stripe.Invoice);
        break;
      }
      case "invoice.payment_failed": {
        await syncInvoiceStatus(event.data.object as Stripe.Invoice, "payment_failed");
        break;
      }
      case "invoice.voided": {
        await syncInvoiceStatus(event.data.object as Stripe.Invoice, "void");
        break;
      }
      case "invoice.marked_uncollectible": {
        await syncInvoiceStatus(event.data.object as Stripe.Invoice, "uncollectible");
        break;
      }
      case "invoice.finalized":
      case "invoice.sent":
      case "invoice.updated": {
        await syncInvoiceStatus(event.data.object as Stripe.Invoice);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error", event.type, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
