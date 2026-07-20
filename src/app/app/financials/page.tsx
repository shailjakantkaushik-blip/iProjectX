import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader, Badge } from "@/components/ui";
import { filterByFy, parseFyFilter } from "@/lib/pmo/engines";
import { computeEvm } from "@/lib/pmo/analytics";
import { formatCurrency, formatPct } from "@/lib/utils";
import { SpendTrendChart } from "@/components/dashboard-charts";
import { HorizontalBarChart } from "@/components/pmo/plotly-charts";

function evmRag(cpi: number) {
  if (cpi >= 0.95) return "green" as const;
  if (cpi >= 0.85) return "amber" as const;
  return "red" as const;
}

export default async function FinancialsPage({
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
    include: { financialMonths: true },
    orderBy: { code: "asc" },
  });

  const projects = filterByFy(allProjects, fyFilter);

  const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const trend = months.map((month) => {
    let actual = 0;
    let forecast = 0;
    for (const p of projects) {
      for (const row of p.financialMonths) {
        if (row.month === month) {
          actual += row.actual;
          forecast += row.forecast;
        }
      }
    }
    return { month, actual, forecast };
  });

  const totals = projects.reduce(
    (acc, p) => {
      acc.funding += p.funding;
      acc.spend += p.spend;
      acc.forecast += p.forecast;
      acc.benefits += p.benefitsRealised;
      return acc;
    },
    { funding: 0, spend: 0, forecast: 0, benefits: 0 }
  );

  const evmRows = projects.map((p) => computeEvm({
    funding: p.funding,
    spend: p.spend,
    forecast: p.forecast,
    progress: p.progress,
  }));

  const capexLabels = projects.map((p) => p.code);
  const capexValues = projects.map((p) => p.funding);
  const spendValues = projects.map((p) => p.spend);

  return (
    <div>
      <PageHeader
        title="Financials"
        description="EVM analysis, portfolio burn, and CAPEX vs actuals — Streamlit Financials parity."
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Funding approved", totals.funding],
          ["Actual spend", totals.spend],
          ["Forecast", totals.forecast],
          ["Benefits realised", totals.benefits],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">{label}</p>
            <p className="kpi-value mt-2 text-2xl">{formatCurrency(value as number)}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Portfolio burn</h3>
          <SpendTrendChart data={trend} />
        </Card>
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">CAPEX vs actual by project</h3>
          <HorizontalBarChart
            labels={capexLabels}
            values={capexValues}
            title="Budget (blue) — top-line funding"
            colorScale
          />
        </Card>
      </div>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Earned Value Management</h3>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          CPI &gt; 1 = under budget, SPI &gt; 1 = ahead of schedule
        </p>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>BAC</th>
                <th>AC</th>
                <th>PV</th>
                <th>EV</th>
                <th>CPI</th>
                <th>SPI</th>
                <th>EAC</th>
                <th>VAC</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, idx) => {
                const evm = evmRows[idx];
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="font-semibold">{p.code}</div>
                      <div className="text-xs text-[var(--ink-soft)]">{p.name}</div>
                    </td>
                    <td>{formatCurrency(evm.bac)}</td>
                    <td>{formatCurrency(evm.ac)}</td>
                    <td>{formatCurrency(evm.pv)}</td>
                    <td>{formatCurrency(evm.ev)}</td>
                    <td>
                      <Badge tone={evmRag(evm.cpi)}>{evm.cpi}</Badge>
                    </td>
                    <td>
                      <Badge tone={evmRag(evm.spi)}>{evm.spi}</Badge>
                    </td>
                    <td>{formatCurrency(evm.eac)}</td>
                    <td>
                      <Badge tone={evm.vac >= 0 ? "green" : "red"}>
                        {formatCurrency(evm.vac)}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        tone={
                          p.rag === "Green" ? "green" : p.rag === "Amber" ? "amber" : "red"
                        }
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

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Funding type breakdown</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>Funding type</th>
                <th>Funding</th>
                <th>Spend</th>
                <th>Forecast</th>
                <th>Variance</th>
                <th>Benefits</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const variance = p.forecast - p.spend;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-[var(--ink-soft)]">{p.code}</div>
                    </td>
                    <td>{p.fundingType || "—"}</td>
                    <td>{formatCurrency(p.funding)}</td>
                    <td>{formatCurrency(p.spend)}</td>
                    <td>{formatCurrency(p.forecast)}</td>
                    <td>
                      <Badge tone={variance < 0 ? "red" : "green"}>{formatCurrency(variance)}</Badge>
                    </td>
                    <td>
                      {formatCurrency(p.benefitsRealised)} / {formatCurrency(p.benefitsTarget)}
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
