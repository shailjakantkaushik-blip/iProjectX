import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui";
import {
  BarChart3,
  Building2,
  Gauge,
  Layers3,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

const capabilities = [
  {
    icon: Gauge,
    title: "Executive cockpit",
    body: "Live RAG, funding burn, and portfolio health in one interactive command view.",
  },
  {
    icon: Workflow,
    title: "Stage-gate delivery",
    body: "Channel A/B governance, milestones, agile sprints, and release registers.",
  },
  {
    icon: BarChart3,
    title: "Financial intelligence",
    body: "CAPEX/OPEX, EVM signals, FY allocation, and benefit realisation tracking.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise controls",
    body: "Role-based access, seat-based subscriptions, and audit-friendly operations.",
  },
  {
    icon: Building2,
    title: "White-label workspaces",
    body: "Brand colors, logos, taglines, and custom domains per enterprise customer.",
  },
  {
    icon: Users,
    title: "Team delivery fabric",
    body: "Resources, demand pipeline, decisions, actions, and program rollups.",
  },
];

export default function HomePage() {
  return (
    <div className="app-shell">
      <MarketingNav />

      <section className="relative overflow-hidden">
        <div className="hero-media absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[var(--background)]" />
        <div className="relative mx-auto grid min-h-[86vh] w-full max-w-6xl items-center gap-10 px-6 pb-20 pt-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="motion-fade-up text-white">
            <p className="font-[family-name:var(--font-display)] text-5xl leading-[0.95] tracking-tight md:text-7xl">
              iProjectX
            </p>
            <h1 className="mt-5 max-w-xl text-2xl font-medium leading-snug md:text-3xl">
              The enterprise platform for portfolio, delivery, and outcomes.
            </h1>
            <p className="mt-4 max-w-lg text-base text-white/85 md:text-lg">
              Move from spreadsheet PMO tooling to a multi-tenant SaaS workspace with
              subscription seats, interactive delivery intelligence, and full white-label branding.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button className="bg-white text-[var(--brand-secondary)] hover:bg-teal-50">
                  Start 14-day trial
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="secondary" className="border-0 bg-white/15 text-white ring-white/30 hover:bg-white/25">
                  View plans
                </Button>
              </Link>
            </div>
          </div>

          <div className="motion-scale-in hidden md:block">
            <div className="rounded-[2rem] bg-white/12 p-4 shadow-2xl ring-1 ring-white/25 backdrop-blur-xl">
              <div className="rounded-[1.5rem] bg-[#071b1a]/70 p-6 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-[0.2em] text-teal-100/80">Live portfolio</span>
                  <Sparkles className="h-4 w-4 text-sky-200" />
                </div>
                <p className="mt-6 font-[family-name:var(--font-display)] text-4xl">$8.4M</p>
                <p className="text-sm text-teal-50/80">Active funded portfolio</p>
                <div className="mt-8 grid grid-cols-3 gap-3 text-center">
                  {[
                    ["62%", "On track"],
                    ["18%", "Watch"],
                    ["20%", "Critical"],
                  ].map(([v, l]) => (
                    <div key={l} className="rounded-xl bg-white/8 px-2 py-3">
                      <div className="text-lg font-semibold">{v}</div>
                      <div className="text-[11px] uppercase tracking-wide text-white/60">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 h-24 rounded-xl bg-gradient-to-r from-teal-400/40 via-sky-400/30 to-emerald-300/20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="motion-fade-up-delay max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl">
            Built as a company-grade delivery OS
          </h2>
          <p className="mt-3 text-[var(--ink-soft)]">
            Everything your PMO needs — from demand intake to stage-gates, finance, risk, and
            executive reporting — packaged for SaaS enterprises.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item, idx) => (
            <article
              key={item.title}
              className="rounded-2xl bg-white/65 p-6 ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <item.icon className="h-5 w-5 text-[var(--brand-primary)]" />
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mb-20 w-full max-w-6xl px-6">
        <div className="overflow-hidden rounded-[2rem] bg-[var(--brand-secondary)] px-8 py-12 text-white md:px-12">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <Layers3 className="h-6 w-6 text-teal-200" />
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl md:text-4xl">
                White-label ready for every enterprise customer
              </h2>
              <p className="mt-3 max-w-xl text-teal-50/85">
                Launch branded workspaces with your colors, logo, support contact, and domain —
                while billing seats on Starter, Professional, or Enterprise plans.
              </p>
            </div>
            <Link href="/signup">
              <Button className="bg-white text-[var(--brand-secondary)] hover:bg-teal-50">
                Create your workspace
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] py-8 text-center text-sm text-[var(--ink-soft)]">
        © {new Date().getFullYear()} iProjectX · Enterprise project management & delivery
      </footer>
    </div>
  );
}
