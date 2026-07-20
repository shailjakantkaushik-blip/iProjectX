import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { filterByFy } from "@/lib/pmo/engines";
import { PortfolioMixChart } from "@/components/dashboard-charts";

export default async function StageGatesPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { fy } = await searchParams;

  const projects = filterByFy(
    await db.project.findMany({
      where: { organizationId: ctx.organization.id },
      select: { id: true, financialYear: true, code: true, name: true },
    }),
    fy
  );
  const ids = projects.map((p) => p.id);
  const gates = await db.stageGate.findMany({
    where: { projectId: { in: ids } },
    include: { project: { select: { code: true, name: true } } },
    orderBy: { plannedDate: "asc" },
  });

  const statuses = ["Approved", "Pending", "Rejected", "In Progress", "In Review"];
  const counts = statuses.map((name) => ({
    name,
    value: gates.filter((g) => g.gateStatus === name).length,
  }));
  const overdue = gates.filter((g) => {
    if (!g.plannedDate || g.gateStatus === "Approved") return false;
    return g.daysLate > 0 || new Date(g.plannedDate) < new Date();
  });

  return (
    <div>
      <PageHeader
        title="Stage Gate Management"
        description="Compliance, overdue gates, and gate register — Streamlit Stage Gates parity."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Total gates</p>
          <p className="kpi-value mt-2 text-2xl">{gates.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Approved</p>
          <p className="kpi-value mt-2 text-2xl">
            {gates.filter((g) => g.gateStatus === "Approved").length}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Pending</p>
          <p className="kpi-value mt-2 text-2xl">
            {gates.filter((g) => g.gateStatus === "Pending" || g.gateStatus === "In Progress").length}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Overdue</p>
          <p className="kpi-value mt-2 text-2xl">{overdue.length}</p>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Status mix</h3>
          <PortfolioMixChart data={counts.filter((c) => c.value > 0)} />
        </Card>
        <Card className="xl:col-span-2">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Gate register</h3>
          <div className="table-wrap mt-4">
            <table className="data">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Stage / gate</th>
                  <th>Channel</th>
                  <th>Next gate</th>
                  <th>Planned</th>
                  <th>Status</th>
                  <th>Checklist</th>
                </tr>
              </thead>
              <tbody>
                {gates.map((g) => (
                  <tr key={g.id}>
                    <td className="font-medium">
                      {g.project.code} · {g.project.name}
                    </td>
                    <td>{g.stage}</td>
                    <td>{g.channel || "—"}</td>
                    <td>{g.nextGate || "—"}</td>
                    <td>{g.plannedDate ? new Date(g.plannedDate).toLocaleDateString() : "—"}</td>
                    <td>
                      <Badge
                        tone={
                          g.gateStatus === "Approved"
                            ? "green"
                            : g.daysLate > 0
                              ? "red"
                              : "amber"
                        }
                      >
                        {g.gateStatus}
                      </Badge>
                    </td>
                    <td>{Math.round(g.checklistPct)}%</td>
                  </tr>
                ))}
                {!gates.length ? (
                  <tr>
                    <td colSpan={7} className="text-[var(--ink-soft)]">
                      No stage gates for this FY filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
