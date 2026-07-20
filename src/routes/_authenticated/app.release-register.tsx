import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useDomainData, type Release } from "@/lib/domain";
import { exportPageCsv } from "@/lib/ppt-export";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton,
  SectionFrame, StatusChip,
} from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/release-register")({
  component: ReleaseRegisterPage,
});

function isOverdue(r: Release, today: Date): boolean {
  if (!r.planned_date) return false;
  const planned = new Date(r.planned_date);
  const status = (r.status || "").toLowerCase();
  if (status === "delivered" || status === "complete" || status === "completed") return false;
  return planned < today;
}

function ReleaseRegisterPage() {
  const { organization } = useAuth();
  const { releases, projects, isLoading } = useDomainData(organization?.id);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [envFilter, setEnvFilter] = useState("All");

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const statuses = useMemo(
    () => [...new Set(releases.map((r) => r.status).filter(Boolean))].sort(),
    [releases],
  );
  const types = useMemo(
    () => [...new Set(releases.map((r) => r.type).filter(Boolean))].sort(),
    [releases],
  );
  const envs = useMemo(
    () => [...new Set(releases.map((r) => r.environment).filter(Boolean) as string[])].sort(),
    [releases],
  );
  const projectNames = useMemo(
    () =>
      [...new Set(releases.map((r) => r.project_name).filter(Boolean) as string[])].sort(),
    [releases],
  );

  const filtered = useMemo(() => {
    return releases
      .filter((r) => {
        if (statusFilter !== "All" && r.status !== statusFilter) return false;
        if (typeFilter !== "All" && r.type !== typeFilter) return false;
        if (projectFilter !== "All" && r.project_name !== projectFilter) return false;
        if (envFilter !== "All" && r.environment !== envFilter) return false;
        return true;
      })
      .slice()
      .sort((a, b) => {
        const da = a.planned_date ? new Date(a.planned_date).getTime() : Infinity;
        const db = b.planned_date ? new Date(b.planned_date).getTime() : Infinity;
        return da - db;
      });
  }, [releases, statusFilter, typeFilter, projectFilter, envFilter]);

  const delivered = filtered.filter((r) =>
    ["delivered", "complete", "completed"].includes((r.status || "").toLowerCase()),
  ).length;
  const planned = filtered.filter((r) =>
    ["planned", "in progress", "in-progress"].includes((r.status || "").toLowerCase()),
  ).length;
  const overdue = filtered.filter((r) => isOverdue(r, today)).length;

  const upcoming = useMemo(() => {
    const horizon = new Date(today.getTime() + 90 * 86400000);
    return filtered
      .filter((r) => {
        if (!r.planned_date) return false;
        const d = new Date(r.planned_date);
        return d >= today && d <= horizon;
      })
      .slice(0, 24);
  }, [filtered, today]);

  const timelineBounds = useMemo(() => {
    const dates = filtered
      .flatMap((r) => [r.planned_date, r.actual_date])
      .filter(Boolean)
      .map((d) => new Date(d!).getTime());
    if (!dates.length) return null;
    const min = Math.min(...dates);
    const max = Math.max(...dates, today.getTime());
    const pad = Math.max(7 * 86400000, (max - min) * 0.05);
    return { min: min - pad, max: max + pad };
  }, [filtered, today]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="🚀"
        title="Release Register"
        subtitle="Planned go-lives, cutovers, and delivery status across the portfolio"
      />

      <SectionFrame title="Filters">
        <div className="flex flex-wrap gap-3">
          {(
            [
              ["Status", statusFilter, setStatusFilter, statuses],
              ["Type", typeFilter, setTypeFilter, types],
              ["Project", projectFilter, setProjectFilter, projectNames],
              ["Environment", envFilter, setEnvFilter, envs],
            ] as const
          ).map(([label, value, set, opts]) => (
            <label key={label} className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              {label}
              <select
                className="h-9 min-w-[140px] rounded-md border border-border bg-surface px-2 text-sm text-heading"
                value={value}
                onChange={(e) => set(e.target.value)}
              >
                <option>All</option>
                {opts.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame title="Release KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total Releases" value={filtered.length} />
          <KpiCard label="Delivered" value={delivered} accent="#16a34a" />
          <KpiCard label="Planned / In-Progress" value={planned} />
          <KpiCard label="Overdue" value={overdue} accent="#dc2626" />
        </div>
      </SectionFrame>

      <SectionFrame>
        <ChartCaption title="Upcoming go-lives (90 days)" caption="Timeline of planned release dates · today marked">
          {!timelineBounds || upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming go-lives"
              description="No planned releases in the next 90 days for the current filters."
            />
          ) : (
            <div className="space-y-2">
              {upcoming.map((r) => {
                const start = new Date(r.planned_date!).getTime();
                const finish = r.actual_date
                  ? new Date(r.actual_date).getTime()
                  : start + 3 * 86400000;
                const { min, max } = timelineBounds;
                const span = max - min || 1;
                const left = ((start - min) / span) * 100;
                const width = Math.max(2, ((Math.max(finish, start) - start) / span) * 100);
                const todayLeft = ((today.getTime() - min) / span) * 100;
                const overdueFlag = isOverdue(r, today);
                return (
                  <div key={r.id} className="grid grid-cols-[160px_1fr] items-center gap-3">
                    <div className="truncate text-[11px] font-medium text-heading" title={r.release_name}>
                      {r.release_name}
                    </div>
                    <div className="relative h-8 rounded-md bg-slate-100">
                      <div
                        className="absolute inset-y-0 w-px bg-red-500"
                        style={{ left: `${todayLeft}%` }}
                        title="Today"
                      />
                      <div
                        className="absolute top-1.5 h-5 rounded-sm"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          background: overdueFlag ? "#dc2626" : "#1d4ed8",
                          opacity: 0.85,
                        }}
                        title={`${r.release_name}: ${r.planned_date}`}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground">Red bar = overdue · Blue = on track · Vertical line = today</p>
            </div>
          )}
        </ChartCaption>
      </SectionFrame>

      <SectionFrame title={`All releases (${filtered.length})`}>
        {filtered.length === 0 ? (
          <EmptyState title="No releases" description="Releases appear once projects have go-live dates or the releases table is seeded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Release Name</th>
                  <th>Project</th>
                  <th>Planned</th>
                  <th>Actual</th>
                  <th>Scope</th>
                  <th>Type</th>
                  <th>Environment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const overdueFlag = isOverdue(r, today);
                  return (
                    <tr
                      key={r.id}
                      className={overdueFlag ? "bg-red-50" : undefined}
                      style={overdueFlag ? { outline: "1px solid rgba(220,38,38,0.25)" } : undefined}
                    >
                      <td className="font-medium">
                        {overdueFlag && <span className="mr-1 text-red-600" title="Overdue">⚑</span>}
                        {r.release_name}
                      </td>
                      <td>{r.project_name || "—"}</td>
                      <td className={overdueFlag ? "font-semibold text-red-600" : undefined}>
                        {r.planned_date || "—"}
                      </td>
                      <td>{r.actual_date || "—"}</td>
                      <td className="max-w-[220px] truncate" title={r.scope || ""}>
                        {r.scope || "—"}
                      </td>
                      <td>{r.type || "—"}</td>
                      <td>{r.environment || "—"}</td>
                      <td>
                        <StatusChip status={r.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "releases.csv",
              filtered.map((r) => ({
                release_name: r.release_name,
                project: r.project_name,
                planned_date: r.planned_date,
                actual_date: r.actual_date,
                scope: r.scope,
                type: r.type,
                environment: r.environment,
                status: r.status,
                overdue: isOverdue(r, today),
              })),
            )
          }
        />
        <p className="mt-2 text-[11px] text-muted-foreground">{projects.length} projects in FY filter scope.</p>
      </SectionFrame>
    </div>
  );
}
