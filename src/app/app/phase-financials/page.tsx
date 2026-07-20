import { redirect } from "next/navigation";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { phaseHealth } from "@/lib/pmo/analytics";
import { formatCurrency } from "@/lib/utils";
import { GaugeChart, HorizontalBarChart } from "@/components/pmo/plotly-charts";
import { PhaseFinancialsClient } from "@/components/pmo/phase-financials-client";

function ragTone(rag: string) {
  if (rag === "Green") return "green" as const;
  if (rag === "Amber") return "amber" as const;
  return "red" as const;
}

export default async function PhaseFinancialsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const [phases, projects] = await Promise.all([
    db.phaseFinancial.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: [{ projectCode: "asc" }, { stage: "asc" }],
    }),
    db.project.findMany({
      where: { organizationId: ctx.organization.id },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const totalBudget = phases.reduce((s, p) => s + p.budget, 0);
  const totalActual = phases.reduce((s, p) => s + p.actual, 0);
  const spendPct = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  const stageMap = new Map<string, number>();
  for (const ph of phases) {
    stageMap.set(ph.stage, (stageMap.get(ph.stage) || 0) + ph.budget);
  }
  const stageLabels = [...stageMap.keys()];
  const stageValues = stageLabels.map((s) => stageMap.get(s) || 0);

  const phasesWithHealth = phases.map((ph) => ({
    ...ph,
    health: phaseHealth(ph.plannedEnd, ph.actualEnd, ph.status),
  }));

  return (
    <div>
      <PageHeader
        title="Phase Financials"
        description="Stage-by-stage budget tracking with schedule health — Streamlit Phase Financials parity."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Phases tracked</p>
          <p className="kpi-value mt-2 text-3xl">{phases.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Total budget</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(totalBudget)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Actual spend</p>
          <p className="kpi-value mt-2 text-2xl">{formatCurrency(totalActual)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Spend %</p>
          <p className="kpi-value mt-2 text-2xl">{Math.round(spendPct)}%</p>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Portfolio spend %</h3>
          <GaugeChart value={Math.round(spendPct)} max={100} title="Spend % of budget" />
        </Card>
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Budget by stage</h3>
          {stageLabels.length > 0 ? (
            <HorizontalBarChart
              labels={stageLabels}
              values={stageValues}
              title="Budget by delivery stage"
              colorScale
            />
          ) : (
            <p className="mt-8 text-center text-sm text-[var(--ink-soft)]">
              No phase data yet.
            </p>
          )}
        </Card>
      </div>

      <PhaseFinancialsClient projects={projects} canEdit={canEdit(ctx.membership.role)} />

      <Card>
        <h3 className="font-[family-name:var(--font-display)] text-xl">Phase financial register</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>Stage</th>
                <th>Planned end</th>
                <th>Budget</th>
                <th>Forecast</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>Status</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {phasesWithHealth.map((ph) => {
                const variance = ph.budget - ph.actual;
                return (
                  <tr key={ph.id}>
                    <td>
                      <div className="font-semibold">{ph.projectCode}</div>
                      {ph.projectName && (
                        <div className="text-xs text-[var(--ink-soft)]">{ph.projectName}</div>
                      )}
                    </td>
                    <td>{ph.stage}</td>
                    <td>
                      {ph.plannedEnd ? new Date(ph.plannedEnd).toLocaleDateString() : "—"}
                    </td>
                    <td>{formatCurrency(ph.budget)}</td>
                    <td>{formatCurrency(ph.forecast)}</td>
                    <td>{formatCurrency(ph.actual)}</td>
                    <td>
                      <Badge tone={variance >= 0 ? "green" : "red"}>
                        {formatCurrency(variance)}
                      </Badge>
                    </td>
                    <td>{ph.status}</td>
                    <td>
                      <Badge tone={ragTone(ph.health)}>{ph.health}</Badge>
                    </td>
                  </tr>
                );
              })}
              {!phases.length && (
                <tr>
                  <td colSpan={9} className="text-[var(--ink-soft)]">
                    No phase financials yet. Add a phase using the form above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
