import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatPct } from "@/lib/utils";
import { Badge, Card, PageHeader } from "@/components/ui";
import {
  CategoryBarChart,
  PortfolioMixChart,
  SpendTrendChart,
} from "@/components/dashboard-charts";
import {
  byField,
  computeKpis,
  computeProjectHealth,
  filterByFy,
  fundingByField,
  ragDistribution,
} from "@/lib/pmo/engines";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { fy } = await searchParams;

  const orgId = ctx.organization.id;
  const [allProjects, risks, actions, financials, updates, pipeline, stageGates] =
    await Promise.all([
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
        take: 6,
      }),
      db.pipelineItem.findMany({ where: { organizationId: orgId } }),
      db.stageGate.findMany({
        where: { project: { organizationId: orgId } },
        include: { project: { select: { code: true, name: true } } },
      }),
    ]);

  const projects = filterByFy(allProjects, fy);
  const kpis = computeKpis(projects);
  const health = computeProjectHealth(projects);
  const ragCounts = ragDistribution(projects);
  const categoryData = fundingByField(projects, "portfolioCategory");
  const themeData = byField(projects, "theme");
  const priorityData = byField(projects, "priority");

  const monthOrder = [
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
  ];
  const projectIds = new Set(projects.map((p) => p.id));
  const trendMap = new Map<string, { month: string; actual: number; forecast: number }>();
  for (const row of financials) {
    if (!projectIds.has(row.projectId)) continue;
    const key = row.month;
    const cur = trendMap.get(key) || { month: key, actual: 0, forecast: 0 };
    cur.actual += row.actual;
    cur.forecast += row.forecast;
    trendMap.set(key, cur);
  }
  const trendData = [...trendMap.values()].sort(
    (a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)
  );

  const pendingGates = stageGates.filter(
    (g) => g.gateStatus === "Pending" || g.gateStatus === "In Progress" || g.gateStatus === "In Review"
  );
  const watchlist = health
    .filter((p) => p.overallHealth === "Red" || p.overallHealth === "Amber")
    .sort((a, b) => (a.overallHealth === "Red" ? -1 : 1))
    .slice(0, 12);

  const financialKpis = [
    { label: "CAPEX approved", value: formatCurrency(kpis.capexApproved) },
    { label: "Cost incurred", value: formatCurrency(kpis.costIncurred) },
    { label: "Forecast", value: formatCurrency(kpis.forecast) },
    { label: "Remaining", value: formatCurrency(kpis.remaining) },
  ];
  const deliveryKpis = [
    { label: "Active", value: String(kpis.active) },
    { label: "Completed", value: String(kpis.completed) },
    { label: "Overdue", value: String(kpis.overdue) },
    { label: "Avg progress", value: formatPct(kpis.avgProgress) },
  ];
  const govKpis = [
    { label: "Open risks", value: String(risks.length) },
    { label: "Open actions", value: String(actions.length) },
    { label: "Pending gates", value: String(pendingGates.length) },
    { label: "Benefits realised", value: formatCurrency(kpis.benefitsRealised) },
  ];

  return (
    <div>
      <PageHeader
        title="Executive Cockpit"
        description={
          fy && fy !== "All"
            ? `Streamlit-parity portfolio command view · FY ${fy}`
            : "Streamlit-parity portfolio command view — financial, delivery, and governance health."
        }
      />

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          Financial
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {financialKpis.map((kpi) => (
            <Card key={kpi.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                {kpi.label}
              </p>
              <p className="kpi-value mt-2 text-2xl">{kpi.value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          Delivery
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {deliveryKpis.map((kpi) => (
            <Card key={kpi.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                {kpi.label}
              </p>
              <p className="kpi-value mt-2 text-2xl">{kpi.value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          Benefits & governance
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {govKpis.map((kpi) => (
            <Card key={kpi.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                {kpi.label}
              </p>
              <p className="kpi-value mt-2 text-2xl">{kpi.value}</p>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">RAG mix</h3>
          <PortfolioMixChart data={ragCounts} />
        </Card>
        <Card className="xl:col-span-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Spend vs forecast</h3>
          <SpendTrendChart data={trendData} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Funding by category</h3>
          <CategoryBarChart data={categoryData} />
        </Card>
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Priority mix</h3>
          <div className="mt-4 space-y-2">
            {priorityData.map((row) => (
              <div key={row.name} className="flex items-center justify-between text-sm">
                <span>{row.name}</span>
                <Badge>{row.value}</Badge>
              </div>
            ))}
            {!priorityData.length ? (
              <p className="text-sm text-[var(--ink-soft)]">No priority data yet.</p>
            ) : null}
          </div>
          <h3 className="mt-6 font-[family-name:var(--font-display)] text-xl">Theme mix</h3>
          <div className="mt-3 space-y-2">
            {themeData.slice(0, 6).map((row) => (
              <div key={row.name} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{row.name}</span>
                <Badge tone="brand">{row.value}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-display)] text-xl">Portfolio health</h3>
            <Link href="/app/projects" className="text-sm font-semibold text-[var(--brand-primary)]">
              Open register
            </Link>
          </div>
          <div className="table-wrap mt-4">
            <table className="data">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Schedule</th>
                  <th>Financial</th>
                  <th>Benefit</th>
                  <th>Overall</th>
                </tr>
              </thead>
              <tbody>
                {health.slice(0, 15).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/app/projects/${p.id}`}
                        className="font-medium text-[var(--brand-primary)]"
                      >
                        {p.code}
                      </Link>
                      <p className="text-xs text-[var(--ink-soft)]">{p.name}</p>
                    </td>
                    <td>
                      <Badge tone={p.scheduleHealth === "Green" ? "green" : p.scheduleHealth === "Amber" ? "amber" : "red"}>
                        {p.scheduleHealth}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={p.financialHealth === "Green" ? "green" : p.financialHealth === "Amber" ? "amber" : "red"}>
                        {p.financialHealth}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={p.benefitHealth === "Green" ? "green" : p.benefitHealth === "Amber" ? "amber" : "red"}>
                        {p.benefitHealth}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={p.overallHealth === "Green" ? "green" : p.overallHealth === "Amber" ? "amber" : "red"}>
                        {p.overallHealth}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Amber / Red watchlist</h3>
          <div className="mt-4 space-y-3">
            {watchlist.map((p) => (
              <Link
                key={p.id}
                href={`/app/projects/${p.id}`}
                className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2 hover:bg-black/[0.05]"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {p.code} · {p.name}
                  </p>
                  <p className="text-xs text-[var(--ink-soft)]">
                    {formatPct(p.progress)} · {formatCurrency(p.funding)}
                  </p>
                </div>
                <Badge tone={p.overallHealth === "Red" ? "red" : "amber"}>{p.overallHealth}</Badge>
              </Link>
            ))}
            {!watchlist.length ? (
              <p className="text-sm text-[var(--ink-soft)]">All projects are Green.</p>
            ) : null}
          </div>

          <h3 className="mt-6 font-[family-name:var(--font-display)] text-xl">Demand pulse</h3>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            {pipeline.length} ideas · pressure {formatCurrency(kpis.pipelinePressure)}
          </p>
          <div className="mt-3 space-y-2">
            {pipeline.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-xl bg-black/[0.03] px-3 py-2 text-sm">
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-[var(--ink-soft)]">{item.decision}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-6 font-[family-name:var(--font-display)] text-xl">Latest updates</h3>
          <div className="mt-3 space-y-2">
            {updates.map((u) => (
              <div key={u.id} className="rounded-xl border border-black/5 px-3 py-2">
                <p className="text-sm font-semibold">{u.title}</p>
                <p className="text-xs text-[var(--ink-soft)] line-clamp-2">{u.body}</p>
              </div>
            ))}
            <Link href="/app/updates" className="text-sm font-semibold text-[var(--brand-primary)]">
              View all updates
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
