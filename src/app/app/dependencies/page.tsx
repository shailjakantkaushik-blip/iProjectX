import { redirect } from "next/navigation";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { filterByFy } from "@/lib/pmo/engines";
import { dependencyTopoOrder } from "@/lib/pmo/analytics";
import { DependenciesClient } from "@/components/pmo/dependencies-client";
import { GanttTimelineChart } from "@/components/pmo/plotly-charts";

export default async function DependenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { fy } = await searchParams;

  const [allProjects, deps] = await Promise.all([
    db.project.findMany({
      where: { organizationId: ctx.organization.id },
      select: {
        id: true,
        code: true,
        name: true,
        financialYear: true,
        startDate: true,
        endDate: true,
        rag: true,
        portfolioCategory: true,
        progress: true,
      },
      orderBy: { name: "asc" },
    }),
    db.dependency.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const projects = filterByFy(allProjects, fy);

  const projectNames = new Set(projects.map((p) => p.name));
  const filtered =
    fy && fy !== "All"
      ? deps.filter((d) => projectNames.has(d.fromName) || projectNames.has(d.toName))
      : deps;

  const healthy = filtered.filter((d) => d.status === "Healthy").length;
  const atRisk = filtered.filter((d) => d.status === "At Risk").length;
  const blocked = filtered.filter((d) => d.status === "Blocked").length;
  const involved = new Set(filtered.flatMap((d) => [d.fromName, d.toName])).size;

  const topoOrder = dependencyTopoOrder(
    deps.map((d) => ({ fromName: d.fromName, toName: d.toName })),
    projects.map((p) => ({ name: p.name, startDate: p.startDate }))
  );

  const topoIndexMap = new Map(topoOrder.map((name, idx) => [name, idx]));

  const ganttRows = projects
    .filter((p) => p.startDate && p.endDate)
    .sort((a, b) => (topoIndexMap.get(a.name) ?? 999) - (topoIndexMap.get(b.name) ?? 999))
    .map((p) => ({
      name: `${p.code} ${p.name}`,
      start: new Date(p.startDate!).toISOString().slice(0, 10),
      end: new Date(p.endDate!).toISOString().slice(0, 10),
      progress: p.progress,
      rag: p.rag,
    }));

  return (
    <div>
      <PageHeader
        title="Dependencies"
        description="Cross-project dependency links with topology-ordered Gantt — Streamlit Dependencies parity."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Total links</p>
          <p className="kpi-value mt-2 text-3xl">{filtered.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Projects involved</p>
          <p className="kpi-value mt-2 text-3xl">{involved}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Healthy</p>
          <p className="kpi-value mt-2 text-3xl text-emerald-700">{healthy}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">At risk / blocked</p>
          <p className="kpi-value mt-2 text-3xl text-amber-600">
            {atRisk} / <span className="text-rose-700">{blocked}</span>
          </p>
        </Card>
      </div>

      {ganttRows.length > 0 && (
        <Card className="mb-6">
          <h3 className="font-[family-name:var(--font-display)] text-xl">
            Topology-ordered Gantt
          </h3>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            Projects sorted by dependency topological order (predecessors before successors)
          </p>
          <GanttTimelineChart rows={ganttRows} title="Dependency-ordered project timeline" />
        </Card>
      )}

      <Card className="mb-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Dependency register</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Type</th>
                <th>Status</th>
                <th>Impact</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">{d.fromName}</td>
                  <td className="font-medium">{d.toName}</td>
                  <td>{d.dependencyType}</td>
                  <td>
                    <Badge
                      tone={
                        d.status === "Healthy"
                          ? "green"
                          : d.status === "Blocked"
                          ? "red"
                          : "amber"
                      }
                    >
                      {d.status}
                    </Badge>
                  </td>
                  <td>{d.impact}</td>
                  <td className="max-w-xs text-xs">{d.notes || "—"}</td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={6} className="text-[var(--ink-soft)]">
                    No dependencies yet. Add links below or import the Dependencies sheet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <DependenciesClient
        projects={projects.map((p) => ({ id: p.id, name: p.name, code: p.code }))}
        canEdit={canEdit(ctx.membership.role)}
      />
    </div>
  );
}
