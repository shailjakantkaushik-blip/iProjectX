"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { priceLabel } from "@/lib/plans";

type PlanOption = {
  slug: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  seatLimit: number;
};

type InvoiceRow = {
  id: string;
  number: string | null;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  description: string | null;
  planSlug: string | null;
  seatCount: number | null;
  interval: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  dueDate: string | Date | null;
  paidAt: string | Date | null;
  createdAt: string | Date;
  organization?: { id: string; name: string; slug: string; billingEmail: string | null };
};

type OrgOption = {
  id: string;
  name: string;
  slug: string;
  billingEmail: string | null;
  seatCount: number;
  subscriptionStatus: string;
  plan: { slug: string; name: string } | null;
};

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "paid"
      ? "green"
      : status === "open" || status === "draft"
        ? "brand"
        : status === "payment_failed" || status === "uncollectible" || status === "past_due"
          ? "red"
          : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}

function InvoiceTable({ invoices }: { invoices: InvoiceRow[] }) {
  if (!invoices.length) {
    return <p className="mt-3 text-sm text-[var(--ink-soft)]">No invoices yet.</p>;
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-[var(--ink-soft)]">
          <tr className="border-b border-black/5">
            <th className="py-2 pr-3 font-medium">Invoice</th>
            <th className="py-2 pr-3 font-medium">Org</th>
            <th className="py-2 pr-3 font-medium">Amount</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Due</th>
            <th className="py-2 font-medium">Pay / PDF</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b border-black/5 align-top">
              <td className="py-3 pr-3">
                <p className="font-medium">{inv.number || inv.id.slice(0, 8)}</p>
                <p className="text-xs text-[var(--ink-soft)]">{inv.description}</p>
              </td>
              <td className="py-3 pr-3">{inv.organization?.name || "—"}</td>
              <td className="py-3 pr-3">
                {priceLabel(inv.status === "paid" ? inv.amountPaid || inv.amountDue : inv.amountDue)}
              </td>
              <td className="py-3 pr-3">
                <StatusBadge status={inv.status} />
              </td>
              <td className="py-3 pr-3 text-[var(--ink-soft)]">
                {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
              </td>
              <td className="py-3">
                <div className="flex flex-wrap gap-2">
                  {inv.hostedInvoiceUrl ? (
                    <a
                      href={inv.hostedInvoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--brand-primary)] underline"
                    >
                      Pay / view
                    </a>
                  ) : null}
                  {inv.invoicePdf ? (
                    <a
                      href={inv.invoicePdf}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--ink-soft)] underline"
                    >
                      PDF
                    </a>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminInvoicePanel({
  organizations,
  plans,
  invoices: initialInvoices,
  stripeConfigured,
}: {
  organizations: OrgOption[];
  plans: PlanOption[];
  invoices: InvoiceRow[];
  stripeConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id || "");
  const selectedOrg = useMemo(
    () => organizations.find((o) => o.id === organizationId),
    [organizations, organizationId]
  );
  const [planSlug, setPlanSlug] = useState(selectedOrg?.plan?.slug || plans[0]?.slug || "enterprise");
  const [seatCount, setSeatCount] = useState(selectedOrg?.seatCount || 25);
  const [interval, setInterval] = useState<"month" | "year">("year");
  const [billingEmail, setBillingEmail] = useState(selectedOrg?.billingEmail || "");
  const [customAmount, setCustomAmount] = useState("");
  const [daysUntilDue, setDaysUntilDue] = useState(30);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedPlan = plans.find((p) => p.slug === planSlug);
  const previewCents =
    customAmount.trim() !== ""
      ? Math.round(Number(customAmount) * 100)
      : interval === "year"
        ? selectedPlan?.annualPrice || 0
        : selectedPlan?.monthlyPrice || 0;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const body: Record<string, unknown> = {
      organizationId,
      planSlug,
      seatCount: Number(seatCount),
      interval,
      daysUntilDue: Number(daysUntilDue),
      send: true,
    };
    if (billingEmail.trim()) body.billingEmail = billingEmail.trim();
    if (customAmount.trim() !== "") {
      body.customAmountCents = Math.round(Number(customAmount) * 100);
    }

    const res = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create invoice");
      return;
    }
    setMessage(
      `Invoice ${data.invoice?.number || "created"} sent. Org activates when Stripe confirms payment.`
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-[family-name:var(--font-display)] text-xl">Enterprise invoicing</h3>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Create a Stripe invoice for an organization. The customer pays the hosted invoice; a webhook
          marks the subscription <strong>active</strong> when payment is confirmed.
        </p>
        {!stripeConfigured ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Stripe is not configured. Add <code>STRIPE_SECRET_KEY</code> and{" "}
            <code>STRIPE_WEBHOOK_SECRET</code> in Vercel, then redeploy. See <code>STRIPE.md</code>.
          </p>
        ) : null}

        <form onSubmit={onCreate} className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Organization</Label>
            <select
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2"
              value={organizationId}
              onChange={(e) => {
                const id = e.target.value;
                setOrganizationId(id);
                const org = organizations.find((o) => o.id === id);
                if (org) {
                  setBillingEmail(org.billingEmail || "");
                  setSeatCount(org.seatCount);
                  if (org.plan?.slug) setPlanSlug(org.plan.slug);
                }
              }}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} · {org.subscriptionStatus}
                  {org.plan ? ` · ${org.plan.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Plan</Label>
            <select
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2"
              value={planSlug}
              onChange={(e) => setPlanSlug(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Billing interval</Label>
            <select
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2"
              value={interval}
              onChange={(e) => setInterval(e.target.value as "month" | "year")}
            >
              <option value="year">Annual</option>
              <option value="month">Monthly</option>
            </select>
          </div>

          <div>
            <Label>Seats</Label>
            <Input
              type="number"
              min={1}
              max={selectedPlan?.seatLimit || 500}
              value={seatCount}
              onChange={(e) => setSeatCount(Number(e.target.value))}
            />
          </div>

          <div>
            <Label>Days until due</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={daysUntilDue}
              onChange={(e) => setDaysUntilDue(Number(e.target.value))}
            />
          </div>

          <div>
            <Label>Billing email</Label>
            <Input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="finance@customer.com"
              required
            />
          </div>

          <div>
            <Label>Custom amount (USD, optional)</Label>
            <Input
              type="number"
              min={0.5}
              step="0.01"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Leave blank for catalog price"
            />
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Invoice total preview: {priceLabel(previewCents)}
            </p>
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || !stripeConfigured || !organizationId}>
              {pending ? "Sending…" : "Create & send invoice"}
            </Button>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="font-[family-name:var(--font-display)] text-xl">Recent invoices</h3>
        <InvoiceTable invoices={initialInvoices} />
      </Card>
    </div>
  );
}

export function OrgInvoicePanel({
  plans,
  currentPlanSlug,
  seatCount,
  memberCount,
  billingEmail: initialEmail,
  invoices,
  stripeConfigured,
}: {
  plans: PlanOption[];
  currentPlanSlug: string;
  seatCount: number;
  memberCount: number;
  billingEmail: string;
  invoices: InvoiceRow[];
  stripeConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [planSlug, setPlanSlug] = useState(currentPlanSlug || plans[0]?.slug || "professional");
  const [seats, setSeats] = useState(seatCount);
  const [interval, setInterval] = useState<"month" | "year">("year");
  const [billingEmail, setBillingEmail] = useState(initialEmail || "");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedPlan = plans.find((p) => p.slug === planSlug);
  const amount =
    interval === "year" ? selectedPlan?.annualPrice || 0 : selectedPlan?.monthlyPrice || 0;

  async function onRequestInvoice(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/billing/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planSlug,
        seatCount: Number(seats),
        interval,
        billingEmail: billingEmail.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create invoice");
      return;
    }
    setMessage(
      "Invoice sent to the billing email. Your subscription activates after payment is confirmed."
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-[family-name:var(--font-display)] text-xl">Request invoice</h3>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Enterprise billing is invoice-led. We email a Stripe invoice; when it is paid, seats and plan
          unlock automatically. Using {memberCount} of {seatCount} seats today.
        </p>
        {!stripeConfigured ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Invoicing is unavailable until the platform configures Stripe.
          </p>
        ) : null}
        <form onSubmit={onRequestInvoice} className="mt-4 space-y-4">
          <div className="grid gap-3">
            {plans.map((plan) => (
              <label
                key={plan.slug}
                className={`cursor-pointer rounded-xl p-4 ring-1 transition ${
                  planSlug === plan.slug
                    ? "bg-[var(--brand-primary)]/10 ring-[var(--brand-primary)]"
                    : "bg-white/70 ring-black/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="plan"
                    checked={planSlug === plan.slug}
                    onChange={() => setPlanSlug(plan.slug)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold">
                      {plan.name} · {priceLabel(plan.monthlyPrice)}/mo · {priceLabel(plan.annualPrice)}
                      /yr
                    </p>
                    <p className="text-xs text-[var(--ink-soft)]">
                      Up to {plan.seatLimit} seats
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Seats</Label>
              <Input
                type="number"
                min={memberCount}
                max={selectedPlan?.seatLimit || 500}
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Interval</Label>
              <select
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2"
                value={interval}
                onChange={(e) => setInterval(e.target.value as "month" | "year")}
              >
                <option value="year">Annual</option>
                <option value="month">Monthly</option>
              </select>
            </div>
            <div>
              <Label>Billing email</Label>
              <Input
                type="email"
                required
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
              />
            </div>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">Invoice amount: {priceLabel(amount)}</p>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          <Button type="submit" disabled={pending || !stripeConfigured}>
            {pending ? "Sending…" : "Send invoice"}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-[family-name:var(--font-display)] text-xl">Your invoices</h3>
        <InvoiceTable invoices={invoices} />
      </Card>
    </div>
  );
}
