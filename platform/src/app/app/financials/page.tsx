import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { SpendTrendChart } from "@/components/dashboard-charts";

export default async function FinancialsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const projects = await db.project.findMany({
    where: { organizationId: ctx.organization.id },
    include: { financialMonths: true },
    orderBy: { code: "asc" },
  });

  const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

  return (
    <div>
      <PageHeader
        title="Financials"
        description="CAPEX/OPEX posture, burn vs forecast, and benefits realisation across the portfolio."
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Funding", totals.funding],
          ["Spend", totals.spend],
          ["Forecast", totals.forecast],
          ["Benefits realised", totals.benefits],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">{label}</p>
            <p className="kpi-value mt-2 text-2xl">{formatCurrency(value as number)}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Portfolio burn</h3>
        <SpendTrendChart data={trend} />
      </Card>

      <Card className="mt-6">
        <div className="table-wrap">
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
                    <td>{p.fundingType}</td>
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
