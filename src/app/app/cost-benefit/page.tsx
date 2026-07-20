import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { costBenefitSummary, filterByFy, parseFyFilter } from "@/lib/pmo/engines";
import { costBenefitByYear } from "@/lib/pmo/analytics";
import { formatCurrency, formatPct } from "@/lib/utils";
import {
  WaterfallChart,
  BubbleScatterChart,
  DonutChart,
} from "@/components/pmo/plotly-charts";

export default async function CostBenefitPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const { fy } = await searchParams;
  const fyFilter = parseFyFilter(fy);
  const orgId = ctx.organization.id;

  const [allProjects, cbYears] = await Promise.all([
    db.project.findMany({ where: { organizationId: orgId }, orderBy: { code: "asc" } }),
    db.costBenefitYear.findMany({
      where: { organizationId: orgId },
      orderBy: { year: "asc" },
    }),
  ]);

  const projects = filterByFy(allProjects, fyFilter);
  const summary = costBenefitSummary(projects);

  const yearlyData =
    cbYears.length > 0
      ? costBenefitByYear(cbYears)
      : (() => {
          const currentYear = new Date().getFullYear();
          return [
            {
              year: currentYear - 1,
              cost: summary.cost * 0.4,
              benefit: summary.benefit * 0.2,
              net: summary.benefit * 0.2 - summary.cost * 0.4,
            },
            {
              year: currentYear,
              cost: summary.cost * 0.4,
              benefit: summary.benefit * 0.4,
              net: summary.benefit * 0.4 - summary.cost * 0.4,
            },
            {
              year: currentYear + 1,
              cost: summary.cost * 0.2,
              benefit: summary.benefit * 0.4,
              net: summary.benefit * 0.4 - summary.cost * 0.2,
            },
          ];
        })();

  const waterfallLabels = [
    "Start",
    ...yearlyData.map((y) => String(y.year)),
    "Cumulative",
  ];
  const waterfallValues = [
    0,
    ...yearlyData.map((y) => y.net),
    yearlyData.reduce((s, y) => s + y.net, 0),
  ];

  const bubblePoints = projects
    .filter((p) => p.funding > 0 || p.benefitsTarget > 0)
    .map((p) => ({
      x: p.funding,
      y: p.benefitsTarget,
      size: p.benefitsRealised,
      label: `${p.code}: ${p.name}`,
      color:
        p.rag === "Green" ? "#059669" : p.rag === "Amber" ? "#d97706" : "#e11d48",
    }));

  const benefitTypes = new Map<string, number>();
  for (const p of projects) {
    const type = p.fundingType || "Unknown";
    benefitTypes.set(type, (benefitTypes.get(type) || 0) + p.benefitsTarget);
  }
  const donutData = [...benefitTypes.entries()].map(([name, value]) => ({ name, value }));

  return (
    <div>
      <PageHeader
        title="Cost vs Benefit"
        description="Portfolio ROI, BCR, year-by-year waterfall, and benefit bubble analysis — Streamlit Cost vs Benefit parity."
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Total cost</p>
          <p className="kpi-value mt-2 text-xl">{formatCurrency(summary.cost)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Benefit target</p>
          <p className="kpi-value mt-2 text-xl">{formatCurrency(summary.benefit)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Net value</p>
          <p
            className={`kpi-value mt-2 text-xl ${
              summary.net >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {formatCurrency(summary.net)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">ROI</p>
          <p className="kpi-value mt-2 text-xl">{formatPct(summary.roi * 100)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">BCR</p>
          <p className="kpi-value mt-2 text-xl">{summary.bcr.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Realised</p>
          <p className="kpi-value mt-2 text-xl">{formatCurrency(summary.realised)}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Net value by year</h3>
          <WaterfallChart
            labels={waterfallLabels}
            values={waterfallValues}
            title="Cumulative net value waterfall"
          />
        </Card>

        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Benefit mix by funding type</h3>
          {donutData.length > 0 ? (
            <DonutChart data={donutData} title="Benefits target by funding type" />
          ) : (
            <p className="mt-8 text-center text-sm text-[var(--ink-soft)]">No data available.</p>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">
          Cost vs benefit bubble chart
        </h3>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          X = cost, Y = benefit target, bubble size = benefits realised. Colour = RAG.
        </p>
        {bubblePoints.length > 0 ? (
          <BubbleScatterChart
            points={bubblePoints}
            title="Cost (x) vs Benefit target (y)"
            xTitle="Cost ($)"
            yTitle="Benefits target ($)"
          />
        ) : (
          <p className="mt-8 text-center text-sm text-[var(--ink-soft)]">
            No project financial data available.
          </p>
        )}
      </Card>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">
          Year-by-year breakdown {cbYears.length > 0 ? "" : "(derived from project data)"}
        </h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Year</th>
                <th>Cost</th>
                <th>Benefit</th>
                <th>Net</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {yearlyData.map((row) => (
                <tr key={row.year}>
                  <td className="font-semibold">{row.year}</td>
                  <td>{formatCurrency(row.cost)}</td>
                  <td>{formatCurrency(row.benefit)}</td>
                  <td>
                    <Badge tone={row.net >= 0 ? "green" : "red"}>
                      {formatCurrency(row.net)}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={row.net >= 0 ? "green" : "amber"}>
                      {row.net >= 0 ? "Positive" : "Negative"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Project economics</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>Cost</th>
                <th>Benefit</th>
                <th>Net</th>
                <th>ROI</th>
                <th>RAG</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const net = p.benefitsTarget - p.funding;
                const roi = p.funding > 0 ? net / p.funding : 0;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="font-semibold">{p.code}</div>
                      <div className="text-xs text-[var(--ink-soft)]">{p.name}</div>
                    </td>
                    <td>{formatCurrency(p.funding)}</td>
                    <td>{formatCurrency(p.benefitsTarget)}</td>
                    <td>
                      <Badge tone={net >= 0 ? "green" : "red"}>{formatCurrency(net)}</Badge>
                    </td>
                    <td>{formatPct(roi * 100)}</td>
                    <td>
                      <Badge
                        tone={p.rag === "Green" ? "green" : p.rag === "Amber" ? "amber" : "red"}
                      >
                        {p.rag}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
