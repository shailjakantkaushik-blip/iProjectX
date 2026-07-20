import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";

export default async function GovernancePage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const [decisions, actions] = await Promise.all([
    db.decision.findMany({
      where: { organizationId: ctx.organization.id },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    }),
    db.action.findMany({
      where: { organizationId: ctx.organization.id },
      include: { project: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Governance"
        description="Decision log and action tracker for steering forums and delivery accountability."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Decisions</h3>
          <div className="mt-4 space-y-3">
            {decisions.map((d) => (
              <div key={d.id} className="rounded-xl bg-white/70 p-4 ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{d.title}</p>
                  <Badge tone={d.status === "Approved" ? "green" : "amber"}>{d.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  {d.project?.name || "Portfolio"} · {d.owner || "Unassigned"}
                </p>
                {d.outcome ? <p className="mt-2 text-sm">{d.outcome}</p> : null}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Actions</h3>
          <div className="table-wrap mt-4">
            <table className="data">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Owner</th>
                  <th>Due</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="font-medium">{a.title}</div>
                      <div className="text-xs text-[var(--ink-soft)]">{a.project?.name || "Portfolio"}</div>
                    </td>
                    <td>{a.owner || "—"}</td>
                    <td>{a.dueDate ? a.dueDate.toISOString().slice(0, 10) : "—"}</td>
                    <td>
                      <Badge
                        tone={
                          a.priority === "Critical" ? "red" : a.priority === "High" ? "amber" : "neutral"
                        }
                      >
                        {a.priority}
                      </Badge>
                    </td>
                    <td>{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
