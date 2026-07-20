import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatPct } from "@/lib/utils";
import { Badge, Card, PageHeader } from "@/components/ui";
import {
  CategoryBarChart,
  PortfolioMixChart,
  SpendTrendChart,
} from "@/components/dashboard-charts";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const orgId = ctx.organization.id;
  const [projects, risks, actions, financials, updates, pipeline] = await Promise.all([
    db.project.findMany({ where: { organizationId: orgId } }),
    db.risk.findMany({ where: { organizationId: orgId, status: { not: "Closed" } } }),
    db.action.findMany({ where: { organizationId: orgId, status: { not: "Done" } } }),
    db.financialMonth.findMany({
      where: { project: { organizationId: orgId } },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    db.update.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.pipelineItem.findMany({ where: { organizationId: orgId } }),
  ]);

  const funding = projects.reduce((s, p) => s + p.funding, 0);
  const spend = projects.reduce((s, p) => s + p.spend, 0);
  const forecast = projects.reduce((s, p) => s + p.forecast, 0);
  const avgProgress =
    projects.length > 0
      ? projects.reduce((s, p) => s + p.progress, 0) / projects.length
      : 0;

  const ragCounts = ["Green", "Amber", "Red"].map((name) => ({
    name,
    value: projects.filter((p) => p.rag === name).length,
  }));

  const categoryMap = new Map<string, number>();
  for (const p of projects) {
    categoryMap.set(p.portfolioCategory, (categoryMap.get(p.portfolioCategory) || 0) + p.funding);
  }
  const categoryData = [...categoryMap.entries()].map(([category, funding]) => ({
    category,
    funding,
  }));

  const monthOrder = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const trendMap = new Map<string, { month: string; actual: number; forecast: number }>();
  for (const row of financials) {
    const key = row.month;
    const cur = trendMap.get(key) || { month: key, actual: 0, forecast: 0 };
    cur.actual += row.actual;
    cur.forecast += row.forecast;
    trendMap.set(key, cur);
  }
  const trendData = [...trendMap.values()].sort(
    (a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)
  );

  const kpis = [
    { label: "Active projects", value: String(projects.filter((p) => p.status === "Active").length) },
    { label: "Funded portfolio", value: formatCurrency(funding) },
    { label: "Spend to date", value: formatCurrency(spend) },
    { label: "Avg progress", value: formatPct(avgProgress) },
    { label: "Open risks", value: String(risks.length) },
    { label: "Open actions", value: String(actions.length) },
  ];

  return (
    <div>
      <PageHeader
        title="Executive Cockpit"
        description="Interactive portfolio health, delivery risk, and financial burn across your enterprise workspace."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((kpi, i) => (
          <Card key={kpi.label} className="motion-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              {kpi.label}
            </p>
            <p className="kpi-value mt-2 text-2xl">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <h3 className="font-[family-name:var(--font-display)] text-xl">RAG mix</h3>
          <p className="text-sm text-[var(--ink-soft)]">Project health distribution</p>
          <PortfolioMixChart data={ragCounts} />
        </Card>
        <Card className="xl:col-span-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Spend vs forecast</h3>
          <p className="text-sm text-[var(--ink-soft)]">Monthly financial pulse</p>
          <SpendTrendChart data={trendData} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Funding by category</h3>
          <CategoryBarChart data={categoryData} />
        </Card>
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Demand pulse</h3>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            {pipeline.length} ideas in intake · forecast pressure{" "}
            {formatCurrency(forecast - funding)}
          </p>
          <div className="mt-5 space-y-3">
            {pipeline.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-xl bg-white/70 px-3 py-3 ring-1 ring-black/5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <Badge tone="brand">{item.priorityScore.toFixed(1)}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">
                  {item.decision} · {formatCurrency(item.estBudget)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Watchlist</h3>
          <div className="table-wrap mt-4">
            <table className="data">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>RAG</th>
                  <th>Stage</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {projects
                  .filter((p) => p.rag !== "Green")
                  .map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-[var(--ink-soft)]">{p.code}</div>
                      </td>
                      <td>
                        <Badge tone={p.rag === "Red" ? "red" : "amber"}>{p.rag}</Badge>
                      </td>
                      <td>{p.stage}</td>
                      <td>{formatPct(p.progress)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Latest updates</h3>
          <div className="mt-4 space-y-4">
            {updates.map((u) => (
              <div key={u.id} className="border-l-2 border-[var(--brand-primary)] pl-4">
                <p className="text-sm font-semibold">{u.title}</p>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">{u.body}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-[var(--ink-soft)]">
                  {u.category}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
