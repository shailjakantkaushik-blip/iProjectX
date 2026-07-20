import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { filterByFy, priorityScore } from "@/lib/pmo/engines";
import { formatCurrency, scorePipeline } from "@/lib/utils";
import { CategoryBarChart } from "@/components/dashboard-charts";

export default async function PrioritisationPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { fy } = await searchParams;

  const [projects, pipeline, risks] = await Promise.all([
    db.project.findMany({
      where: { organizationId: ctx.organization.id },
      include: { brief: true },
      orderBy: { name: "asc" },
    }),
    db.pipelineItem.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { priorityScore: "desc" },
    }),
    db.risk.findMany({
      where: { organizationId: ctx.organization.id, status: { not: "Closed" } },
      select: { projectId: true },
    }),
  ]);

  const riskCounts = new Map<string, number>();
  for (const r of risks) {
    if (!r.projectId) continue;
    riskCounts.set(r.projectId, (riskCounts.get(r.projectId) || 0) + 1);
  }

  const ranked = filterByFy(projects, fy)
    .map((p) => {
      const alignRaw = p.brief?.strategicAlignment;
      const alignNum = alignRaw ? Number(String(alignRaw).replace(/[^0-9.]/g, "")) || 3 : 3;
      const score = priorityScore({
        priority: p.priority,
        strategicAlignment: alignNum,
        openRiskCount: riskCounts.get(p.id) || 0,
        benefitValue: p.benefitsTarget,
        budget: p.funding,
      });
      return { ...p, score, openRisks: riskCounts.get(p.id) || 0, alignNum };
    })
    .sort((a, b) => b.score - a.score);

  const chart = ranked.slice(0, 15).map((p) => ({ category: p.code, funding: p.score }));

  return (
    <div>
      <PageHeader
        title="Prioritisation"
        description="Rank initiatives by priority, alignment, risk load, and benefit/budget — Streamlit Prioritisation parity."
      />

      <Card>
        <h3 className="font-[family-name:var(--font-display)] text-xl">Top ranked projects</h3>
        <CategoryBarChart data={chart} />
      </Card>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Ranked project list</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Project</th>
                <th>Score</th>
                <th>Priority</th>
                <th>Alignment</th>
                <th>Open risks</th>
                <th>Benefits</th>
                <th>Funding</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p, i) => (
                <tr key={p.id}>
                  <td className="font-semibold">{i + 1}</td>
                  <td>
                    <Link href={`/app/projects/${p.id}`} className="font-medium text-[var(--brand-primary)]">
                      {p.code}
                    </Link>
                    <p className="text-xs text-[var(--ink-soft)]">{p.name}</p>
                  </td>
                  <td>
                    <Badge tone="brand">{p.score}</Badge>
                  </td>
                  <td>{p.priority}</td>
                  <td>{p.alignNum}/5</td>
                  <td>{p.openRisks}</td>
                  <td>{formatCurrency(p.benefitsTarget)}</td>
                  <td>{formatCurrency(p.funding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Demand pipeline scores</h3>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Strategic 30% · Benefit 25% · Risk reduction 15% · Compliance 15% · Complexity −15%
        </p>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Idea</th>
                <th>Score</th>
                <th>Align</th>
                <th>Benefit</th>
                <th>Risk↓</th>
                <th>Compliance</th>
                <th>Complexity</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map((item) => {
                const live = scorePipeline(item);
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-[var(--ink-soft)]">{item.code}</div>
                    </td>
                    <td>
                      <Badge tone="brand">{(item.priorityScore || live).toFixed(2)}</Badge>
                    </td>
                    <td>{item.strategicAlignment}</td>
                    <td>{item.benefitValue}</td>
                    <td>{item.riskReduction}</td>
                    <td>{item.compliance}</td>
                    <td>{item.complexity}</td>
                    <td>{item.decision}</td>
                  </tr>
                );
              })}
              {!pipeline.length ? (
                <tr>
                  <td colSpan={8} className="text-[var(--ink-soft)]">
                    No demand pipeline items yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
