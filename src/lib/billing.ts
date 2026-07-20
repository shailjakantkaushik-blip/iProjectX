import type Stripe from "stripe";
import { db } from "./db";
import { getStripe, isStripeConfigured } from "./stripe";
import { priceLabel } from "./plans";

export type BillingInterval = "month" | "year";

export type CreateInvoiceInput = {
  organizationId: string;
  planSlug: "starter" | "professional" | "enterprise";
  seatCount: number;
  interval: BillingInterval;
  /** Override computed amount (cents). Useful for custom enterprise quotes. */
  customAmountCents?: number;
  daysUntilDue?: number;
  description?: string;
  createdByUserId?: string;
  /** Finalize + email via Stripe (default true). */
  send?: boolean;
  /** Set/override org billing email before sending. */
  billingEmail?: string;
};

function computeAmountCents(plan: {
  monthlyPrice: number;
  annualPrice: number;
  seatLimit: number;
}, seatCount: number, interval: BillingInterval) {
  const base = interval === "year" ? plan.annualPrice : plan.monthlyPrice;
  // Catalog prices are for the plan’s included seat pack; scale linearly above default pack size of 1 seat pack.
  // For simplicity: charge catalog price as the period fee (seat pack), not per-seat microbilling.
  // If seatCount exceeds seatLimit, reject earlier. Optional: proportional uplift if seats > catalog baseline.
  void seatCount;
  void plan.seatLimit;
  return base;
}

async function ensureStripeCustomer(org: {
  id: string;
  name: string;
  slug: string;
  billingEmail: string | null;
  stripeCustomerId: string | null;
}) {
  const stripe = getStripe();
  if (org.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(org.stripeCustomerId);
      if (!("deleted" in existing && existing.deleted)) {
        if (org.billingEmail && !("deleted" in existing)) {
          await stripe.customers.update(existing.id, { email: org.billingEmail });
        }
        return existing.id;
      }
    } catch {
      /* recreate below */
    }
  }

  const customer = await stripe.customers.create({
    name: org.name,
    email: org.billingEmail || undefined,
    metadata: {
      organizationId: org.id,
      organizationSlug: org.slug,
    },
  });

  await db.organization.update({
    where: { id: org.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

function mapStripeInvoiceStatus(status: Stripe.Invoice.Status | null): string {
  if (!status) return "draft";
  if (status === "paid") return "paid";
  if (status === "open") return "open";
  if (status === "void") return "void";
  if (status === "uncollectible") return "uncollectible";
  return status;
}

export async function createAndSendInvoice(input: CreateInvoiceInput) {
  if (!isStripeConfigured()) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET) in Vercel."
    );
  }

  const plan = await db.plan.findUnique({ where: { slug: input.planSlug } });
  if (!plan) throw new Error("Plan not found");
  if (input.seatCount < 1 || input.seatCount > plan.seatLimit) {
    throw new Error(`Seat count must be between 1 and ${plan.seatLimit}`);
  }

  let org = await db.organization.findUnique({
    where: { id: input.organizationId },
  });
  if (!org) throw new Error("Organization not found");

  if (input.billingEmail) {
    org = await db.organization.update({
      where: { id: org.id },
      data: { billingEmail: input.billingEmail.trim().toLowerCase() },
    });
  }

  if (!org.billingEmail) {
    throw new Error(
      "Organization needs a billing email before an invoice can be sent."
    );
  }

  const amount =
    typeof input.customAmountCents === "number"
      ? input.customAmountCents
      : computeAmountCents(plan, input.seatCount, input.interval);

  if (amount < 50) {
    throw new Error("Invoice amount must be at least $0.50");
  }

  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(org);
  const daysUntilDue = input.daysUntilDue ?? 30;
  const periodLabel = input.interval === "year" ? "annual" : "monthly";
  const description =
    input.description ||
    `${plan.name} plan · ${input.seatCount} seats · ${periodLabel} · ${priceLabel(amount)}`;

  // Create invoice first so line items attach to it.
  const draft = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: daysUntilDue,
    auto_advance: true,
    metadata: {
      organizationId: org.id,
      planSlug: plan.slug,
      seatCount: String(input.seatCount),
      interval: input.interval,
    },
    description,
  });

  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: draft.id,
    amount,
    currency: "usd",
    description: `${plan.name} (${periodLabel}) — up to ${input.seatCount} seats`,
  });

  if (!draft.id) throw new Error("Stripe did not return an invoice id");

  let invoice = await stripe.invoices.finalizeInvoice(draft.id);

  const shouldSend = input.send !== false;
  if (shouldSend && invoice.id) {
    invoice = await stripe.invoices.sendInvoice(invoice.id);
  }

  if (!invoice.id) throw new Error("Stripe invoice missing id after finalize");

  const record = await db.invoice.create({
    data: {
      organizationId: org.id,
      stripeInvoiceId: invoice.id,
      stripeCustomerId: customerId,
      number: invoice.number,
      status: mapStripeInvoiceStatus(invoice.status),
      amountDue: invoice.amount_due ?? amount,
      amountPaid: invoice.amount_paid ?? 0,
      currency: invoice.currency || "usd",
      description,
      planSlug: plan.slug,
      seatCount: input.seatCount,
      interval: input.interval,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      createdByUserId: input.createdByUserId,
    },
  });

  // Pending payment: mark org past_due/trialing stay until paid; use past_due only if previously active.
  if (org.subscriptionStatus === "active") {
    await db.organization.update({
      where: { id: org.id },
      data: { subscriptionStatus: "past_due" },
    });
  }

  return { invoice: record, stripeInvoice: invoice };
}

export async function applyPaidInvoice(stripeInvoice: Stripe.Invoice) {
  const organizationId = stripeInvoice.metadata?.organizationId;
  const planSlug = stripeInvoice.metadata?.planSlug;
  const seatCountRaw = stripeInvoice.metadata?.seatCount;
  const seatCount = seatCountRaw ? Number(seatCountRaw) : undefined;

  const local = await db.invoice.findFirst({
    where: { stripeInvoiceId: stripeInvoice.id },
  });

  const orgId = organizationId || local?.organizationId;
  if (!orgId) {
    console.warn("Stripe invoice.paid without organizationId", stripeInvoice.id);
    return;
  }

  const plan =
    (planSlug && (await db.plan.findUnique({ where: { slug: planSlug } }))) ||
    (local?.planSlug
      ? await db.plan.findUnique({ where: { slug: local.planSlug } })
      : null);

  await db.organization.update({
    where: { id: orgId },
    data: {
      subscriptionStatus: "active",
      stripeCustomerId:
        typeof stripeInvoice.customer === "string"
          ? stripeInvoice.customer
          : stripeInvoice.customer?.id,
      ...(plan ? { planId: plan.id } : {}),
      ...(seatCount && Number.isFinite(seatCount) ? { seatCount } : {}),
      trialEndsAt: null,
    },
  });

  if (local) {
    await db.invoice.update({
      where: { id: local.id },
      data: {
        status: "paid",
        amountDue: stripeInvoice.amount_due ?? local.amountDue,
        amountPaid: stripeInvoice.amount_paid ?? local.amountPaid,
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
        invoicePdf: stripeInvoice.invoice_pdf,
        number: stripeInvoice.number,
        paidAt: new Date(),
      },
    });
  } else {
    await db.invoice.create({
      data: {
        organizationId: orgId,
        stripeInvoiceId: stripeInvoice.id,
        stripeCustomerId:
          typeof stripeInvoice.customer === "string"
            ? stripeInvoice.customer
            : stripeInvoice.customer?.id,
        number: stripeInvoice.number,
        status: "paid",
        amountDue: stripeInvoice.amount_due ?? 0,
        amountPaid: stripeInvoice.amount_paid ?? 0,
        currency: stripeInvoice.currency || "usd",
        description: stripeInvoice.description,
        planSlug: planSlug || null,
        seatCount: seatCount && Number.isFinite(seatCount) ? seatCount : null,
        interval: stripeInvoice.metadata?.interval || null,
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
        invoicePdf: stripeInvoice.invoice_pdf,
        dueDate: stripeInvoice.due_date
          ? new Date(stripeInvoice.due_date * 1000)
          : null,
        paidAt: new Date(),
      },
    });
  }
}

export async function syncInvoiceStatus(
  stripeInvoice: Stripe.Invoice,
  fallbackStatus?: string
) {
  const status = fallbackStatus || mapStripeInvoiceStatus(stripeInvoice.status);
  const local = await db.invoice.findFirst({
    where: { stripeInvoiceId: stripeInvoice.id },
  });
  if (!local) return;

  await db.invoice.update({
    where: { id: local.id },
    data: {
      status,
      amountDue: stripeInvoice.amount_due ?? local.amountDue,
      amountPaid: stripeInvoice.amount_paid ?? local.amountPaid,
      hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
      invoicePdf: stripeInvoice.invoice_pdf,
      number: stripeInvoice.number,
      paidAt: status === "paid" ? new Date() : local.paidAt,
    },
  });

  if (status === "uncollectible" || status === "payment_failed") {
    await db.organization.update({
      where: { id: local.organizationId },
      data: { subscriptionStatus: "past_due" },
    });
  }
  if (status === "void") {
    // leave org status alone
  }
}
