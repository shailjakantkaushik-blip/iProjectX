import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { Button, Badge } from "@/components/ui";
import { db } from "@/lib/db";
import { priceLabel } from "@/lib/plans";
import { Check } from "lucide-react";

export default async function PricingPage() {
  let plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" } });
  if (!plans.length) {
    // Fallback if DB not seeded yet
    const { PLAN_CATALOG } = await import("@/lib/plans");
    plans = PLAN_CATALOG.map((p, idx) => ({
      id: String(idx),
      slug: p.slug,
      name: p.name,
      description: p.description,
      monthlyPrice: p.monthlyPrice,
      annualPrice: p.annualPrice,
      seatLimit: p.seatLimit,
      projectLimit: p.projectLimit,
      features: JSON.stringify(p.features),
      isEnterprise: p.isEnterprise,
      sortOrder: p.sortOrder,
      createdAt: new Date(),
    }));
  }

  return (
    <div className="app-shell">
      <MarketingNav />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl">
            Subscription plans for every enterprise team
          </h1>
          <p className="mt-4 text-[var(--ink-soft)]">
            Seat-based billing with project limits, governance depth, and white-label capabilities
            that scale with your customers.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const features = JSON.parse(plan.features || "[]") as string[];
            const featured = plan.slug === "professional";
            return (
              <article
                key={plan.slug}
                className={`rounded-[1.75rem] p-7 ring-1 transition hover:-translate-y-1 ${
                  featured
                    ? "bg-[var(--brand-secondary)] text-white ring-[var(--brand-secondary)] shadow-xl"
                    : "bg-white/70 ring-black/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-display)] text-2xl">{plan.name}</h2>
                  {featured ? <Badge tone="brand">Most popular</Badge> : null}
                </div>
                <p className={`mt-2 text-sm ${featured ? "text-teal-50/80" : "text-[var(--ink-soft)]"}`}>
                  {plan.description}
                </p>
                <p className="mt-6 font-[family-name:var(--font-display)] text-5xl">
                  {priceLabel(plan.monthlyPrice)}
                  <span className="text-base font-sans opacity-70">/mo</span>
                </p>
                <p className={`mt-1 text-sm ${featured ? "text-teal-50/70" : "text-[var(--ink-soft)]"}`}>
                  Up to {plan.seatLimit} seats · {plan.projectLimit} projects
                </p>
                <ul className="mt-6 space-y-3">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-teal-200" : "text-[var(--brand-primary)]"}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/signup?plan=${plan.slug}`} className="mt-8 block">
                  <Button
                    className={`w-full ${
                      featured
                        ? "bg-white text-[var(--brand-secondary)] hover:bg-teal-50"
                        : ""
                    }`}
                    variant={featured ? "secondary" : "primary"}
                  >
                    Start with {plan.name}
                  </Button>
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
