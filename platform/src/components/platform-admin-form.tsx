"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "./ui";

type SiteForm = {
  brandName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  logoUrl: string;
  supportEmail: string;
  footerText: string;
  showPricing: boolean;
  showSignup: boolean;
  enableExcelImport: boolean;
  enablePptExport: boolean;
  enablePdfExport: boolean;
  featureCardsJson: string;
};

export function PlatformAdminForm({ initial }: { initial: SiteForm }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/site-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    setMessage("Platform settings saved. Landing page updated.");
    startTransition(() => router.refresh());
  }

  return (
    <Card>
      <h3 className="font-[family-name:var(--font-display)] text-xl">Landing page & global features</h3>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        Platform-owner controls for marketing content and product-wide feature toggles.
      </p>
      <form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <Label>Brand name</Label>
          <Input value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
        </div>
        <div>
          <Label>Support email</Label>
          <Input value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>Hero title</Label>
          <Input value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>Hero subtitle</Label>
          <textarea
            className="min-h-24 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={form.heroSubtitle}
            onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
          />
        </div>
        <div>
          <Label>Primary CTA label</Label>
          <Input value={form.heroCtaLabel} onChange={(e) => setForm({ ...form, heroCtaLabel: e.target.value })} />
        </div>
        <div>
          <Label>Primary CTA href</Label>
          <Input value={form.heroCtaHref} onChange={(e) => setForm({ ...form, heroCtaHref: e.target.value })} />
        </div>
        <div>
          <Label>Secondary CTA label</Label>
          <Input
            value={form.secondaryCtaLabel}
            onChange={(e) => setForm({ ...form, secondaryCtaLabel: e.target.value })}
          />
        </div>
        <div>
          <Label>Secondary CTA href</Label>
          <Input
            value={form.secondaryCtaHref}
            onChange={(e) => setForm({ ...form, secondaryCtaHref: e.target.value })}
          />
        </div>
        <div>
          <Label>Primary color</Label>
          <Input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
        </div>
        <div>
          <Label>Accent color</Label>
          <Input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} />
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
          <Label>Logo URL</Label>
          <Input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>Footer text</Label>
          <Input value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>Feature cards JSON</Label>
          <textarea
            className="min-h-36 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 font-mono text-xs"
            value={form.featureCardsJson}
            onChange={(e) => setForm({ ...form, featureCardsJson: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.showPricing} onChange={(e) => setForm({ ...form, showPricing: e.target.checked })} />
          Show pricing page link
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.showSignup} onChange={(e) => setForm({ ...form, showSignup: e.target.checked })} />
          Show signup / trial CTA
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enableExcelImport}
            onChange={(e) => setForm({ ...form, enableExcelImport: e.target.checked })}
          />
          Enable Excel import globally
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enablePptExport}
            onChange={(e) => setForm({ ...form, enablePptExport: e.target.checked })}
          />
          Enable PPT export globally
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enablePdfExport}
            onChange={(e) => setForm({ ...form, enablePdfExport: e.target.checked })}
          />
          Enable PDF export globally
        </label>
        {error ? <p className="text-sm text-rose-600 md:col-span-2">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700 md:col-span-2">{message}</p> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save platform settings"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
