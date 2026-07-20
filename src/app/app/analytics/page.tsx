import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader, Badge } from "@/components/ui";
import { filterByFy, fundingByField, parseFyFilter } from "@/lib/pmo/engines";
import { monteCarloCosts } from "@/lib/pmo/analytics";
import {
  HistogramChart,
  DonutChart,
  HorizontalBarChart,
} from "@/components/pmo/plotly-charts";
import { formatCurrency } from "@/lib/utils";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const { fy } = await searchParams;
  const fyFilter = parseFyFilter(fy);

  const allProjects = await db.project.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { code: "asc" },
  });

  const projects = filterByFy(allProjects, fyFilter);

  const mc = monteCarloCosts(
    projects.map((p) => ({ funding: p.funding, forecast: p.forecast, spend: p.spend }))
  );

  const fundingTypeMix = fundingByField(projects, "fundingType");
  const donutData = fundingTypeMix.map((f) => ({ name: f.category, value: f.funding }));

  const byTheme = fundingByField(projects, "theme");
  const themeLabels = byTheme.map((b) => b.category).slice(0, 15);
  const themeValues = byTheme.map((b) => b.funding).slice(0, 15);

  const riskData = await db.risk.findMany({
    where: { organizationId: ctx.organization.id, status: "Open" },
    select: { rag: true },
  });
  const riskByRag = ["Green", "Amber", "Red"].map((rag) => ({
    name: rag,
    value: riskData.filter((r) => r.rag === rag).length,
  }));

  return (
    <div>
      <PageHeader
        title="Roadmap Analytics"
        description="Monte Carlo cost outcomes, investment mix, and risk exposure — Streamlit Analytics parity."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Projects</p>
          <p className="kpi-value mt-2 text-3xl">{projects.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">P50 cost outcome</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(mc.p50)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">P80 cost outcome</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(mc.p80)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">P95 cost outcome</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(mc.p95)}</p>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">
            Monte Carlo cost distribution
          </h3>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            800 simulated portfolio cost outcomes based on forecast variance
          </p>
          <HistogramChart
            values={mc.outcomes}
            title="Simulated total cost (800 runs)"
            nbins={30}
          />
        </Card>

        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Investment mix</h3>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">Funding by type</p>
          {donutData.length > 0 ? (
            <DonutChart data={donutData} title="Funding by type" />
          ) : (
            <p className="mt-8 text-center text-sm text-[var(--ink-soft)]">
              No funding type data. Set fundingType on projects.
            </p>
          )}
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Budget by theme</h3>
          {themeLabels.length > 0 ? (
            <HorizontalBarChart
              labels={themeLabels}
              values={themeValues}
              title="Funding by theme"
              colorScale
            />
          ) : (
            <p className="mt-6 text-sm text-[var(--ink-soft)]">
              No theme data. Set theme on projects.
            </p>
          )}
        </Card>

        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Open risk exposure</h3>
          <DonutChart
            data={riskByRag}
            title="Open risks by RAG"
            colors={["#059669", "#d97706", "#e11d48"]}
          />
        </Card>
      </div>

      <Card>
        <h3 className="font-[family-name:var(--font-display)] text-xl">
          Monte Carlo percentiles
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "P50 — median outcome",
              value: mc.p50,
              tone: "green" as const,
              desc: "50% of simulations below",
            },
            {
              label: "P80 — budget contingency",
              value: mc.p80,
              tone: "amber" as const,
              desc: "80% of simulations below",
            },
            {
              label: "P95 — stress scenario",
              value: mc.p95,
              tone: "red" as const,
              desc: "95% of simulations below",
            },
          ].map((row) => (
            <div key={row.label} className="rounded-xl bg-white/60 p-4 ring-1 ring-black/5">
              <Badge tone={row.tone}>{row.label}</Badge>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(row.value)}</p>
              <p className="text-xs text-[var(--ink-soft)]">{row.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
