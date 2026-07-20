import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { costBenefitSummary, filterByFy } from "@/lib/pmo/engines";
import { formatCurrency, formatPct } from "@/lib/utils";
import { CategoryBarChart } from "@/components/dashboard-charts";

export default async function BenefitsPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { fy } = await searchParams;
  const projects = filterByFy(
    await db.project.findMany({ where: { organizationId: ctx.organization.id } }),
    fy
  );
  const summary = costBenefitSummary(projects);
  const chart = projects
    .map((p) => ({ category: p.code, funding: p.benefitsRealised }))
    .sort((a, b) => b.funding - a.funding)
    .slice(0, 12);

  return (
    <div>
      <PageHeader
        title="Benefits Realisation"
        description="Target vs realised benefits across the portfolio — Streamlit Benefits parity."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Benefits target</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(summary.benefit)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Realised</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(summary.realised)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Gap</p>
          <p className="kpi-value mt-2 text-2xl">
            {formatCurrency(summary.benefit - summary.realised)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Realisation rate</p>
          <p className="kpi-value mt-2 text-2xl">
            {formatPct(summary.benefit > 0 ? (summary.realised / summary.benefit) * 100 : 0)}
          </p>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Realised by project</h3>
          <CategoryBarChart data={chart} />
        </Card>
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Benefits register</h3>
          <div className="table-wrap mt-4">
            <table className="data">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Target</th>
                  <th>Realised</th>
                  <th>%</th>
                  <th>RAG</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const rate = p.benefitsTarget > 0 ? p.benefitsRealised / p.benefitsTarget : 0;
                  return (
                    <tr key={p.id}>
                      <td className="font-medium">
                        {p.code} · {p.name}
                      </td>
                      <td>{formatCurrency(p.benefitsTarget)}</td>
                      <td>{formatCurrency(p.benefitsRealised)}</td>
                      <td>{formatPct(rate * 100)}</td>
                      <td>
                        <Badge tone={p.rag === "Green" ? "green" : p.rag === "Amber" ? "amber" : "red"}>
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
    </div>
  );
}
