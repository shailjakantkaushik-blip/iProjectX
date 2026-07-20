import { redirect } from "next/navigation";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { MovementsClient } from "@/components/pmo/movements-client";

export default async function MovementsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const [movements, projects] = await Promise.all([
    db.portfolioMovement.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
    }),
    db.project.findMany({
      where: { organizationId: ctx.organization.id },
      select: {
        id: true,
        code: true,
        name: true,
        portfolioCategory: true,
      },
      orderBy: { code: "asc" },
    }),
  ]);

  const uniqueCategories = [...new Set(movements.flatMap((m) => [m.fromCategory, m.toCategory]))];
  const categoryCounts = uniqueCategories.map((cat) => ({
    category: cat,
    inflows: movements.filter((m) => m.toCategory === cat).length,
    outflows: movements.filter((m) => m.fromCategory === cat).length,
  }));

  return (
    <div>
      <PageHeader
        title="Portfolio Movements"
        description="Track and audit portfolio category reclassifications — Streamlit Movements parity."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Total movements</p>
          <p className="kpi-value mt-2 text-3xl">{movements.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Projects tracked</p>
          <p className="kpi-value mt-2 text-3xl">
            {new Set(movements.map((m) => m.projectCode)).size}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">
            Categories involved
          </p>
          <p className="kpi-value mt-2 text-3xl">{uniqueCategories.length}</p>
        </Card>
      </div>

      <MovementsClient projects={projects} canEdit={canEdit(ctx.membership.role)} />

      {categoryCounts.length > 0 && (
        <Card className="mb-6">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Category flow summary</h3>
          <div className="table-wrap mt-4">
            <table className="data">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Inflows</th>
                  <th>Outflows</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {categoryCounts.map((c) => (
                  <tr key={c.category}>
                    <td className="font-medium">{c.category}</td>
                    <td>
                      <Badge tone="green">{c.inflows}</Badge>
                    </td>
                    <td>
                      <Badge tone="red">{c.outflows}</Badge>
                    </td>
                    <td>
                      <Badge tone={c.inflows - c.outflows >= 0 ? "green" : "red"}>
                        {c.inflows - c.outflows > 0 ? "+" : ""}
                        {c.inflows - c.outflows}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="font-[family-name:var(--font-display)] text-xl">Movement audit log</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>From</th>
                <th>To</th>
                <th>Reason</th>
                <th>Changed by</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="font-semibold">{m.projectCode}</div>
                    {m.projectName && (
                      <div className="text-xs text-[var(--ink-soft)]">{m.projectName}</div>
                    )}
                  </td>
                  <td>
                    <Badge tone="neutral">{m.fromCategory}</Badge>
                  </td>
                  <td>
                    <Badge tone="brand">{m.toCategory}</Badge>
                  </td>
                  <td className="max-w-xs text-xs">{m.reason || "—"}</td>
                  <td>{m.changedBy || "—"}</td>
                  <td>{new Date(m.effectiveDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {!movements.length && (
                <tr>
                  <td colSpan={6} className="text-[var(--ink-soft)]">
                    No movements recorded yet. Use the form above to reclassify a project.
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
