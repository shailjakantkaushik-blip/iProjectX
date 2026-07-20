import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";

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

  return (
    <div>
      <PageHeader
        title="Agile & Releases"
        description="Sprint velocity, burndown signals, and release register for agile delivery streams."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Sprints</h3>
          <div className="mt-4 space-y-3">
            {sprints.map((s) => {
              const pct = s.committedPts ? Math.round((s.completedPts / s.committedPts) * 100) : 0;
              return (
                <div key={s.id} className="rounded-xl bg-white/70 p-4 ring-1 ring-black/5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-[var(--ink-soft)]">{s.project?.name || "Portfolio"}</p>
                    </div>
                    <Badge tone={s.status === "Complete" ? "green" : "brand"}>{s.status}</Badge>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
                    <div
                      className="h-full rounded-full bg-[var(--brand-accent)]"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--ink-soft)]">
                    {s.completedPts}/{s.committedPts} pts · {pct}% complete
                  </p>
                </div>
              );
            })}
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
                      <Badge>{r.status}</Badge>
                    </td>
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
