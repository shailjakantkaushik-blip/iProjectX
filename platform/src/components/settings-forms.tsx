"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Card, Badge } from "./ui";
import { priceLabel } from "@/lib/plans";

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  monthlyPrice: number;
  seatLimit: number;
  projectLimit: number;
  features: string;
  isEnterprise: boolean;
};

export function BrandingForm({
  initial,
  planSlug,
}: {
  initial: {
    brandName: string;
    primaryColor: string;
    accentColor: string;
    secondaryColor: string;
    logoUrl: string;
    supportEmail: string;
    loginTagline: string;
    customDomain: string;
    hidePoweredBy: boolean;
  };
  planSlug: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/settings/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save branding");
      return;
    }
    setMessage("Branding saved. Workspace theme updated.");
    startTransition(() => router.refresh());
  }

  const whiteLabelLocked = planSlug === "starter";
  const enterpriseLocked = planSlug !== "enterprise";

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-xl">White-label branding</h3>
        {whiteLabelLocked ? <Badge tone="amber">Upgrade for full white-label</Badge> : null}
      </div>
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Brand name</Label>
          <Input
            value={form.brandName}
            onChange={(e) => setForm({ ...form, brandName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Primary color</Label>
          <Input
            type="color"
            value={form.primaryColor}
            onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
          />
        </div>
        <div>
          <Label>Accent color</Label>
          <Input
            type="color"
            value={form.accentColor}
            onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
          />
        </div>
        <div>
          <Label>Secondary color</Label>
          <Input
            type="color"
            value={form.secondaryColor}
            onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
          />
        </div>
        <div>
          <Label>Support email</Label>
          <Input
            value={form.supportEmail}
            onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Login tagline</Label>
          <Input
            value={form.loginTagline}
            onChange={(e) => setForm({ ...form, loginTagline: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Logo URL {whiteLabelLocked ? "(Professional+)" : ""}</Label>
          <Input
            value={form.logoUrl}
            disabled={whiteLabelLocked}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="md:col-span-2">
          <Label>Custom domain {enterpriseLocked ? "(Enterprise)" : ""}</Label>
          <Input
            value={form.customDomain}
            disabled={enterpriseLocked}
            onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
            placeholder="pmo.customer.com"
          />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.hidePoweredBy}
            disabled={enterpriseLocked}
            onChange={(e) => setForm({ ...form, hidePoweredBy: e.target.checked })}
          />
          Hide “Powered by iProjectX” (Enterprise)
        </label>
        {error ? <p className="text-sm text-rose-600 md:col-span-2">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700 md:col-span-2">{message}</p> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save branding"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function BillingForm({
  plans,
  currentPlanSlug,
  seatCount,
  memberCount,
}: {
  plans: Plan[];
  currentPlanSlug: string;
  seatCount: number;
  memberCount: number;
}) {
  const router = useRouter();
  const [planSlug, setPlanSlug] = useState(currentPlanSlug);
  const [seats, setSeats] = useState(seatCount);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/settings/billing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planSlug, seatCount: Number(seats) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Billing update failed");
      return;
    }
    setMessage("Subscription updated.");
    startTransition(() => router.refresh());
  }

  return (
    <Card>
      <h3 className="font-[family-name:var(--font-display)] text-xl">Subscription & seats</h3>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        Currently using {memberCount} of {seatCount} seats.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div className="grid gap-3">
          {plans.map((plan) => {
            const features = JSON.parse(plan.features || "[]") as string[];
            return (
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
                      {plan.name} · {priceLabel(plan.monthlyPrice)}/mo
                    </p>
                    <p className="text-sm text-[var(--ink-soft)]">{plan.description}</p>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">
                      {plan.seatLimit} seats · {plan.projectLimit} projects · {features[0]}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        <div>
          <Label>Seat count</Label>
          <Input
            type="number"
            min={memberCount}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
          />
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update subscription"}
        </Button>
      </form>
    </Card>
  );
}

export function MembersForm({
  canManage,
}: {
  canManage: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "pm",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  if (!canManage) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Invite failed");
      return;
    }
    setMessage(`Added ${form.email} as ${form.role}.`);
    setForm({ name: "", email: "", role: "pm" });
    startTransition(() => router.refresh());
  }

  return (
    <Card>
      <h3 className="font-[family-name:var(--font-display)] text-xl">Add member</h3>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Role</Label>
          <select
            className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="admin">Admin</option>
            <option value="executive">Executive (read-only)</option>
            <option value="bu_lead">BU Lead</option>
            <option value="pm">Project Manager</option>
          </select>
        </div>
        {error ? <p className="text-sm text-rose-600 md:col-span-2">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700 md:col-span-2">{message}</p> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add seat user"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
