import { redirect } from "next/navigation";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { costBenefitSummary, filterByFy, parseFyFilter } from "@/lib/pmo/engines";
import { formatCurrency, formatPct } from "@/lib/utils";
import { DonutChart } from "@/components/pmo/plotly-charts";
import { BenefitsClient } from "@/components/pmo/benefits-client";

export default async function BenefitsPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const { fy } = await searchParams;
  const fyFilter = parseFyFilter(fy);
  const orgId = ctx.organization.id;

  const [allProjects, benefits] = await Promise.all([
    db.project.findMany({ where: { organizationId: orgId }, orderBy: { code: "asc" } }),
    db.benefit.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const projects = filterByFy(allProjects, fyFilter);
  const summary = costBenefitSummary(projects);

  const filteredBenefits = fyFilter
    ? benefits.filter((b) => !b.fy || b.fy === fyFilter)
    : benefits;

  const benefitsByType = new Map<string, number>();
  for (const b of filteredBenefits) {
    benefitsByType.set(b.benefitType, (benefitsByType.get(b.benefitType) || 0) + b.targetValue);
  }
  const donutData = [...benefitsByType.entries()].map(([name, value]) => ({ name, value }));

  const totalTarget = filteredBenefits.reduce((s, b) => s + b.targetValue, 0);
  const totalRealised = filteredBenefits.reduce((s, b) => s + b.realisedValue, 0);
  const realisationRate = totalTarget > 0 ? (totalRealised / totalTarget) * 100 : 0;

  const projectOptions = allProjects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
  }));

  return (
    <div>
      <PageHeader
        title="Benefits Realisation"
        description="Benefits register with CRUD, realisation tracking, and type breakdown — Streamlit Benefits parity."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Benefit records</p>
          <p className="kpi-value mt-2 text-2xl">{filteredBenefits.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Benefits target</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(summary.benefit)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Realised</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(summary.realised)}</p>
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
          <h3 className="font-[family-name:var(--font-display)] text-xl">Benefits by type</h3>
          {donutData.length > 0 ? (
            <DonutChart data={donutData} title="Target value by benefit type" />
          ) : (
            <p className="mt-8 text-center text-sm text-[var(--ink-soft)]">
              No benefit register entries yet. Add via the form below.
            </p>
          )}
        </Card>

        {filteredBenefits.length > 0 && (
          <Card>
            <h3 className="font-[family-name:var(--font-display)] text-xl">Register summary</h3>
            <dl className="mt-4 space-y-3">
              {[
                ["Total target", formatCurrency(totalTarget)],
                ["Total realised", formatCurrency(totalRealised)],
                ["Gap", formatCurrency(totalTarget - totalRealised)],
                ["Rate", formatPct(realisationRate)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-[var(--line)] pb-2">
                  <dt className="text-sm text-[var(--ink-soft)]">{label}</dt>
                  <dd className="text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 space-y-1 text-xs text-[var(--ink-soft)]">
              {(["Financial", "Non-Financial", "Efficiency", "Risk Reduction", "Strategic"] as const).map((type) => {
                const count = filteredBenefits.filter((b) => b.benefitType === type).length;
                return count > 0 ? (
                  <div key={type} className="flex justify-between">
                    <span>{type}</span>
                    <span className="font-medium">{count} benefits</span>
                  </div>
                ) : null;
              })}
            </div>
          </Card>
        )}
      </div>

      <BenefitsClient projects={projectOptions} canEdit={canEdit(ctx.membership.role)} />

      <Card>
        <h3 className="font-[family-name:var(--font-display)] text-xl">Benefits register</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Title</th>
                <th>Project</th>
                <th>Type</th>
                <th>Target</th>
                <th>Realised</th>
                <th>Rate</th>
                <th>Owner</th>
                <th>Status</th>
                <th>FY</th>
              </tr>
            </thead>
            <tbody>
              {filteredBenefits.map((b) => {
                const rate = b.targetValue > 0 ? (b.realisedValue / b.targetValue) * 100 : 0;
                return (
                  <tr key={b.id}>
                    <td className="font-medium">{b.title}</td>
                    <td>{b.projectName || b.projectCode || "Portfolio"}</td>
                    <td>
                      <Badge tone="neutral">{b.benefitType}</Badge>
                    </td>
                    <td>{formatCurrency(b.targetValue)}</td>
                    <td>{formatCurrency(b.realisedValue)}</td>
                    <td>
                      <Badge tone={rate >= 70 ? "green" : rate >= 30 ? "amber" : "red"}>
                        {formatPct(rate)}
                      </Badge>
                    </td>
                    <td>{b.owner || "—"}</td>
                    <td>
                      <Badge
                        tone={
                          b.status === "Realised"
                            ? "green"
                            : b.status === "At Risk"
                            ? "red"
                            : "neutral"
                        }
                      >
                        {b.status}
                      </Badge>
                    </td>
                    <td>{b.fy || "—"}</td>
                  </tr>
                );
              })}
              {!filteredBenefits.length && (
                <tr>
                  <td colSpan={9} className="text-[var(--ink-soft)]">
                    No benefits registered yet. Use the form above to add entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Project-level benefits (from portfolio)</h3>
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
  );
}
