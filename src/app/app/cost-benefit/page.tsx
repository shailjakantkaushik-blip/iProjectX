import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { costBenefitSummary, filterByFy } from "@/lib/pmo/engines";
import { formatCurrency, formatPct } from "@/lib/utils";
import { CategoryBarChart } from "@/components/dashboard-charts";

export default async function CostBenefitPage({
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
  const bubble = projects
    .map((p) => ({
      category: p.code,
      funding: p.benefitsTarget - p.funding,
    }))
    .sort((a, b) => b.funding - a.funding)
    .slice(0, 15);

  return (
    <div>
      <PageHeader
        title="Cost vs Benefit"
        description="Portfolio ROI, BCR and net value — Streamlit Cost vs Benefit parity."
      />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Cost</p>
          <p className="kpi-value mt-2 text-xl">{formatCurrency(summary.cost)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Benefit target</p>
          <p className="kpi-value mt-2 text-xl">{formatCurrency(summary.benefit)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Net</p>
          <p className="kpi-value mt-2 text-xl">{formatCurrency(summary.net)}</p>
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
          <h3 className="font-[family-name:var(--font-display)] text-xl">Net value by project</h3>
          <CategoryBarChart data={bubble} />
        </Card>
        <Card>
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
                      <td className="font-medium">{p.code}</td>
                      <td>{formatCurrency(p.funding)}</td>
                      <td>{formatCurrency(p.benefitsTarget)}</td>
                      <td>{formatCurrency(net)}</td>
                      <td>{formatPct(roi * 100)}</td>
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
