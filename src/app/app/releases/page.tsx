import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { filterByFy } from "@/lib/pmo/engines";

export default async function ReleasesPage({
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
      select: { id: true, financialYear: true },
    }),
    fy
  );
  const projectIds = new Set(projects.map((p) => p.id));

  const releases = await db.release.findMany({
    where: { organizationId: ctx.organization.id },
    include: { project: { select: { id: true, code: true, name: true } } },
    orderBy: { plannedDate: "asc" },
  });

  const filtered = releases.filter((r) => !r.projectId || projectIds.has(r.projectId));
  const today = new Date();
  const delivered = filtered.filter((r) => r.status === "Delivered" || r.status === "Released").length;
  const planned = filtered.filter((r) => r.status === "Planned" || r.status === "In Progress").length;
  const overdue = filtered.filter((r) => {
    if (!r.plannedDate || r.actualDate) return false;
    if (r.status === "Delivered" || r.status === "Released") return false;
    return new Date(r.plannedDate) < today;
  }).length;

  return (
    <div>
      <PageHeader
        title="Release Register"
        description="Planned vs actual releases across the portfolio — Streamlit Release Register parity."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Total</p>
          <p className="kpi-value mt-2 text-3xl">{filtered.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Delivered</p>
          <p className="kpi-value mt-2 text-3xl">{delivered}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Planned / in progress</p>
          <p className="kpi-value mt-2 text-3xl">{planned}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Overdue</p>
          <p className="kpi-value mt-2 text-3xl">{overdue}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Planned</th>
                <th>Actual</th>
                <th>Release</th>
                <th>Version</th>
                <th>Type</th>
                <th>Project</th>
                <th>Env</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.plannedDate ? r.plannedDate.toLocaleDateString() : "TBD"}</td>
                  <td>{r.actualDate ? r.actualDate.toLocaleDateString() : "—"}</td>
                  <td className="font-medium">{r.title}</td>
                  <td>{r.version}</td>
                  <td>{r.releaseType}</td>
                  <td>
                    {r.project ? (
                      <Link
                        href={`/app/projects/${r.project.id}`}
                        className="text-[var(--brand-primary)] hover:underline"
                      >
                        {r.project.code} · {r.project.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{r.environment}</td>
                  <td>
                    <Badge
                      tone={
                        r.status === "Delivered" || r.status === "Released"
                          ? "green"
                          : overdue && r.plannedDate && new Date(r.plannedDate) < today && !r.actualDate
                            ? "red"
                            : "amber"
                      }
                    >
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={8} className="text-[var(--ink-soft)]">
                    No releases yet. Import Releases sheet or seed sample data.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
