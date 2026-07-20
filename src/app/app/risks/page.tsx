import { redirect } from "next/navigation";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { riskScoreAdvanced } from "@/lib/pmo/analytics";
import { RisksClient } from "@/components/pmo/risks-client";
import { BubbleScatterChart } from "@/components/pmo/plotly-charts";

function ragTone(rag: string) {
  if (rag === "Green") return "green" as const;
  if (rag === "Amber") return "amber" as const;
  return "red" as const;
}

export default async function RisksPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const [risks, projects] = await Promise.all([
    db.risk.findMany({
      where: { organizationId: ctx.organization.id },
      include: { project: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.project.findMany({
      where: { organizationId: ctx.organization.id },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const ranked = [...risks].sort(
    (a, b) =>
      riskScoreAdvanced(b.probability, b.impact, b.velocity) -
      riskScoreAdvanced(a.probability, a.impact, a.velocity)
  );

  const bubblePoints = risks
    .filter((r) => r.status === "Open" || r.status === "Mitigating")
    .map((r) => ({
      x: r.probability,
      y: r.impact,
      size: r.velocity * r.probability * r.impact,
      label: `${r.code}: ${r.title}`,
      color:
        r.rag === "Green" ? "#059669" : r.rag === "Amber" ? "#d97706" : "#e11d48",
    }));

  const openCount = risks.filter((r) => r.status === "Open").length;
  const mitigatingCount = risks.filter((r) => r.status === "Mitigating").length;
  const closedCount = risks.filter((r) => r.status === "Closed").length;
  const redCount = risks.filter((r) => r.rag === "Red").length;

  return (
    <div>
      <PageHeader
        title="Risk Intelligence"
        description="Advanced P×I×V scoring, bubble scatter chart, and full RAID register — Streamlit Risks parity."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Open</p>
          <p className="kpi-value mt-2 text-3xl text-rose-700">{openCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Mitigating</p>
          <p className="kpi-value mt-2 text-3xl text-amber-600">{mitigatingCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Closed</p>
          <p className="kpi-value mt-2 text-3xl text-emerald-700">{closedCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">RAG Red</p>
          <p className="kpi-value mt-2 text-3xl text-rose-700">{redCount}</p>
        </Card>
      </div>

      {bubblePoints.length > 0 ? (
        <Card className="mb-6">
          <h3 className="font-[family-name:var(--font-display)] text-xl">
            Risk bubble chart
          </h3>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            X = Probability (1–5), Y = Impact (1–5), bubble size = P×I×V score. Colour = RAG.
          </p>
          <BubbleScatterChart
            points={bubblePoints}
            title="Risk P × I (open & mitigating)"
            xTitle="Probability (1–5)"
            yTitle="Impact (1–5)"
          />
        </Card>
      ) : null}

      <RisksClient projects={projects} canEdit={canEdit(ctx.membership.role)} />

      <Card>
        <h3 className="font-[family-name:var(--font-display)] text-xl">Risk register</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Risk</th>
                <th>Project</th>
                <th>P</th>
                <th>I</th>
                <th>V</th>
                <th>Score</th>
                <th>RAG</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => {
                const score = riskScoreAdvanced(r.probability, r.impact, r.velocity);
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="font-semibold">{r.title}</div>
                      <div className="text-xs text-[var(--ink-soft)]">{r.code}</div>
                    </td>
                    <td>{r.project?.name || "Portfolio"}</td>
                    <td className="text-center">{r.probability}</td>
                    <td className="text-center">{r.impact}</td>
                    <td className="text-center">{r.velocity}</td>
                    <td>
                      <span className="font-semibold">{score}</span>
                    </td>
                    <td>
                      <Badge tone={ragTone(r.rag)}>{r.rag}</Badge>
                    </td>
                    <td>{r.owner || "—"}</td>
                    <td>
                      <Badge
                        tone={
                          r.status === "Closed"
                            ? "green"
                            : r.status === "Mitigating"
                            ? "amber"
                            : "red"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {!ranked.length && (
                <tr>
                  <td colSpan={9} className="text-[var(--ink-soft)]">
                    No risks logged yet. Use the form above to add a risk.
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
