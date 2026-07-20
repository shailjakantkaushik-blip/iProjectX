import Link from "next/link";
import { redirect } from "next/navigation";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { filterByFy, fyTagOptions, parseFyFilter } from "@/lib/pmo/engines";
import { formatCurrency } from "@/lib/utils";
import { WaterfallChart, HeatmapChart } from "@/components/pmo/plotly-charts";
import { FyAllocClient } from "@/components/pmo/fy-alloc-client";

export default async function FyAllocationPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const { fy } = await searchParams;
  const fyFilter = parseFyFilter(fy);
  const orgId = ctx.organization.id;

  const [projects, fyAllocs] = await Promise.all([
    db.project.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    }),
    db.fyAllocation.findMany({
      where: { organizationId: orgId },
      orderBy: [{ fy: "asc" }, { projectCode: "asc" }],
    }),
  ]);

  const fyOptions = fyTagOptions(projects.map((p) => p.financialYear));
  const rows = fyOptions.map((tag) => {
    const tagged = projects.filter((p) => p.financialYear === tag);
    const budget = tagged.reduce((s, p) => s + p.funding, 0);
    const actual = tagged.reduce((s, p) => s + p.spend, 0);
    const forecast = tagged.reduce((s, p) => s + p.forecast, 0);
    return {
      tag,
      count: tagged.length,
      budget,
      actual,
      forecast,
      variance: budget - actual,
      coverage: budget > 0 ? Math.round((actual / budget) * 100) : 0,
    };
  });

  const detail = filterByFy(projects, fyFilter);

  const totals = {
    budget: projects.reduce((s, p) => s + p.funding, 0),
    actual: projects.reduce((s, p) => s + p.spend, 0),
    forecast: projects.reduce((s, p) => s + p.forecast, 0),
  };

  const waterfallLabels = ["Start", ...fyOptions, "Total"];
  const waterfallValues = [
    0,
    ...rows.map((r) => r.budget),
    rows.reduce((s, r) => s + r.budget, 0),
  ];

  const heatmapProjects = [...new Set(fyAllocs.map((a) => a.projectCode))];
  const heatmapFYs = [...new Set(fyAllocs.map((a) => a.fy))].sort();
  const heatmapZ = heatmapProjects.map((code) =>
    heatmapFYs.map(
      (fyTag) =>
        fyAllocs.find((a) => a.projectCode === code && a.fy === fyTag)?.budgetAmount || 0
    )
  );

  return (
    <div>
      <PageHeader
        title="FY Allocation"
        description="Budget waterfall, project×FY heatmap, and allocation editor — Streamlit FY Allocation parity."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Total budget</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(totals.budget)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Actual spend</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(totals.actual)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Forecast</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(totals.forecast)}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Budget by FY</h3>
          <WaterfallChart
            labels={waterfallLabels}
            values={waterfallValues}
            title="Portfolio budget by financial year"
          />
        </Card>

        {heatmapZ.length > 0 ? (
          <Card>
            <h3 className="font-[family-name:var(--font-display)] text-xl">Project × FY budget matrix</h3>
            <HeatmapChart
              z={heatmapZ}
              x={heatmapFYs}
              y={heatmapProjects}
              title="Budget amount ($)"
              colorscale="Blues"
            />
          </Card>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((r) => (
          <Card key={r.tag} className={fyFilter === r.tag ? "ring-2 ring-[var(--brand-primary)]" : undefined}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{r.tag}</p>
            <p className="mt-2 text-2xl font-semibold">{r.count}</p>
            <p className="text-xs text-[var(--ink-soft)]">projects · {r.coverage}% spent</p>
            <dl className="mt-3 space-y-1 text-xs text-[var(--ink-soft)]">
              <div className="flex justify-between gap-2">
                <dt>Budget</dt>
                <dd className="font-medium text-[var(--ink)]">{formatCurrency(r.budget)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Actual</dt>
                <dd className="font-medium text-[var(--ink)]">{formatCurrency(r.actual)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Forecast</dt>
                <dd className="font-medium text-[var(--ink)]">{formatCurrency(r.forecast)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Variance</dt>
                <dd className={`font-medium ${r.variance < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {formatCurrency(r.variance)}
                </dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>

      <FyAllocClient
        projects={projects.map((p) => ({ id: p.id, code: p.code, name: p.name }))}
        canEdit={canEdit(ctx.membership.role)}
      />

      {fyAllocs.length > 0 && (
        <Card className="mt-6">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Allocation register</h3>
          <div className="table-wrap mt-4">
            <table className="data">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>FY</th>
                  <th>Budget amount</th>
                  <th>Forecast amount</th>
                  <th>Budget %</th>
                  <th>Forecast %</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {fyAllocs.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="font-medium">{a.projectCode}</div>
                      {a.projectName && (
                        <div className="text-xs text-[var(--ink-soft)]">{a.projectName}</div>
                      )}
                    </td>
                    <td>
                      <Badge tone="brand">{a.fy}</Badge>
                    </td>
                    <td>{formatCurrency(a.budgetAmount)}</td>
                    <td>{formatCurrency(a.forecastAmount)}</td>
                    <td>{a.budgetPct}%</td>
                    <td>{a.forecastPct}%</td>
                    <td className="text-xs">{a.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">
          Project FY tags {fyFilter ? `(filtered: ${fyFilter})` : ""}
        </h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>FY</th>
                <th>Budget</th>
                <th>Actual</th>
                <th>Forecast</th>
                <th>RAG</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/app/projects/${p.id}`} className="font-medium text-[var(--brand-primary)]">
                      {p.code}
                    </Link>
                    <p className="text-xs text-[var(--ink-soft)]">{p.name}</p>
                  </td>
                  <td>{p.financialYear || "—"}</td>
                  <td>{formatCurrency(p.funding)}</td>
                  <td>{formatCurrency(p.spend)}</td>
                  <td>{formatCurrency(p.forecast)}</td>
                  <td>
                    <Badge tone={p.rag === "Green" ? "green" : p.rag === "Amber" ? "amber" : "red"}>
                      {p.rag}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
