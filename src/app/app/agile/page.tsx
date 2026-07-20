import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { HorizontalBarChart } from "@/components/pmo/plotly-charts";

export default async function AgilePage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const [sprints, releases] = await Promise.all([
    db.sprint.findMany({
      where: { organizationId: ctx.organization.id },
      include: { project: true },
      orderBy: { startDate: "desc" },
    }),
    db.release.findMany({
      where: { organizationId: ctx.organization.id },
      include: { project: true },
      orderBy: { plannedDate: "asc" },
    }),
  ]);

  const sprintLabels = sprints.slice(0, 15).map((s) => s.name);
  const committedValues = sprints.slice(0, 15).map((s) => s.committedPts);
  const completedValues = sprints.slice(0, 15).map((s) => s.completedPts);

  const avgVelocity =
    sprints.length > 0
      ? Math.round(
          sprints.reduce((s, sp) => s + sp.completedPts, 0) / sprints.length
        )
      : 0;

  const completedSprints = sprints.filter((s) => s.status === "Complete").length;
  const activeSprints = sprints.filter((s) => s.status === "Active").length;

  const upcomingReleases = releases.filter((r) => r.status !== "Released").length;

  return (
    <div>
      <PageHeader
        title="Agile & Releases"
        description="Sprint velocity, committed vs completed, and release register — Streamlit Agile parity."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Total sprints</p>
          <p className="kpi-value mt-2 text-3xl">{sprints.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Avg velocity</p>
          <p className="kpi-value mt-2 text-3xl">{avgVelocity} pts</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Active / complete</p>
          <p className="kpi-value mt-2 text-3xl">
            {activeSprints} / {completedSprints}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Upcoming releases</p>
          <p className="kpi-value mt-2 text-3xl">{upcomingReleases}</p>
        </Card>
      </div>

      {sprintLabels.length > 0 ? (
        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <Card>
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              Committed story points
            </h3>
            <HorizontalBarChart
              labels={sprintLabels}
              values={committedValues}
              title="Committed points per sprint"
              colorScale
            />
          </Card>
          <Card>
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              Completed story points (velocity)
            </h3>
            <HorizontalBarChart
              labels={sprintLabels}
              values={completedValues}
              title="Completed points per sprint"
              colorScale
            />
          </Card>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Sprints</h3>
          <div className="mt-4 space-y-3">
            {sprints.map((s) => {
              const pct = s.committedPts ? Math.round((s.completedPts / s.committedPts) * 100) : 0;
              const statusTone =
                s.status === "Complete"
                  ? ("green" as const)
                  : s.status === "Active"
                  ? ("brand" as const)
                  : ("neutral" as const);
              return (
                <div key={s.id} className="rounded-xl bg-white/70 p-4 ring-1 ring-black/5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-[var(--ink-soft)]">
                        {s.project?.name || "Portfolio"} ·{" "}
                        {s.startDate ? new Date(s.startDate).toLocaleDateString() : "—"} →{" "}
                        {s.endDate ? new Date(s.endDate).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <Badge tone={statusTone}>{s.status}</Badge>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
                    <div
                      className="h-full rounded-full bg-[var(--brand-accent)]"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--ink-soft)]">
                    {s.completedPts}/{s.committedPts} pts · {pct}% velocity
                  </p>
                </div>
              );
            })}
            {!sprints.length && (
              <p className="text-sm text-[var(--ink-soft)]">
                No sprints yet. Import the Agile sheet or add via project.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Release register</h3>
          <div className="table-wrap mt-4">
            <table className="data">
              <thead>
                <tr>
                  <th>Release</th>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Env</th>
                  <th>Planned</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-semibold">{r.version}</div>
                      <div className="text-xs text-[var(--ink-soft)]">{r.title}</div>
                    </td>
                    <td>{r.project?.name || "—"}</td>
                    <td>{r.releaseType}</td>
                    <td>{r.environment}</td>
                    <td>
                      {r.plannedDate ? new Date(r.plannedDate).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <Badge
                        tone={
                          r.status === "Released"
                            ? "green"
                            : r.status === "Planned"
                            ? "neutral"
                            : "amber"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {!releases.length && (
                  <tr>
                    <td colSpan={6} className="text-[var(--ink-soft)]">
                      No releases scheduled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
