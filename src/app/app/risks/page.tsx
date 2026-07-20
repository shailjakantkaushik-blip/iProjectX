import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { riskScore } from "@/lib/utils";

export default async function RisksPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const risks = await db.risk.findMany({
    where: { organizationId: ctx.organization.id },
    include: { project: true },
    orderBy: { updatedAt: "desc" },
  });

  const ranked = [...risks].sort(
    (a, b) =>
      riskScore(b.probability, b.impact, b.velocity) -
      riskScore(a.probability, a.impact, a.velocity)
  );

  return (
    <div>
      <PageHeader
        title="Risks"
        description="Probability × Impact × Velocity scoring with mitigation ownership."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {["Open", "Mitigating", "Closed"].map((status) => (
          <Card key={status}>
            <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">{status}</p>
            <p className="kpi-value mt-2 text-3xl">
              {risks.filter((r) => r.status === status).length}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Risk</th>
                <th>Project</th>
                <th>P×I×V</th>
                <th>RAG</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => {
                const score = riskScore(r.probability, r.impact, r.velocity);
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="font-semibold">{r.title}</div>
                      <div className="text-xs text-[var(--ink-soft)]">{r.code}</div>
                    </td>
                    <td>{r.project?.name || "Portfolio"}</td>
                    <td>
                      <div className="font-semibold">{score}</div>
                      <div className="text-xs text-[var(--ink-soft)]">
                        {r.probability}×{r.impact}×{r.velocity}
                      </div>
                    </td>
                    <td>
                      <Badge tone={r.rag === "Green" ? "green" : r.rag === "Amber" ? "amber" : "red"}>
                        {r.rag}
                      </Badge>
                    </td>
                    <td>{r.owner || "—"}</td>
                    <td>{r.status}</td>
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
