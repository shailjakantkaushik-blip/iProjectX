import { redirect } from "next/navigation";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ActionsClient, DecisionsClient } from "@/components/pmo/governance-client";

export default async function GovernancePage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const [decisions, actions, projects] = await Promise.all([
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
    db.project.findMany({
      where: { organizationId: ctx.organization.id },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const editable = canEdit(ctx.membership.role);
  const today = new Date();
  const awaiting = decisions.filter((d) => d.status === "Pending").length;
  const openActions = actions.filter((a) => a.status !== "Done").length;
  const overdueActions = actions.filter(
    (a) => a.dueDate && a.status !== "Done" && new Date(a.dueDate) < today
  ).length;

  return (
    <div>
      <PageHeader
        title="Decisions & Actions"
        description="Decision log and action tracker — Streamlit Decisions + Actions parity."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Decisions</p>
          <p className="kpi-value mt-2 text-3xl">{decisions.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Awaiting</p>
          <p className="kpi-value mt-2 text-3xl">{awaiting}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Open actions</p>
          <p className="kpi-value mt-2 text-3xl">{openActions}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Overdue actions</p>
          <p className="kpi-value mt-2 text-3xl">{overdueActions}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <DecisionsClient projects={projects} canEdit={editable} />
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
              {!decisions.length ? (
                <p className="text-sm text-[var(--ink-soft)]">No decisions yet.</p>
              ) : null}
            </div>
          </Card>
        </div>

        <div>
          <ActionsClient projects={projects} canEdit={editable} />
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
                        <div className="text-xs text-[var(--ink-soft)]">
                          {a.project?.name || "Portfolio"}
                        </div>
                      </td>
                      <td>{a.owner || "—"}</td>
                      <td>{a.dueDate ? a.dueDate.toISOString().slice(0, 10) : "—"}</td>
                      <td>
                        <Badge
                          tone={
                            a.priority === "Critical"
                              ? "red"
                              : a.priority === "High"
                                ? "amber"
                                : "neutral"
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
    </div>
  );
}
