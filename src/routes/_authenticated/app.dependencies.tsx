import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useDomainData, type Dependency } from "@/lib/portfolio-engine";
import {
  EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton,
  SectionFrame, StatusChip,
} from "@/components/streamlit";
import { exportPageCsv } from "@/lib/excel";

export const Route = createFileRoute("/_authenticated/app/dependencies")({
  component: DependenciesPage,
});

const STATUS_COLOR: Record<string, string> = {
  Healthy: "#16a34a",
  "At Risk": "#f59e0b",
  Blocked: "#dc2626",
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isNeededByOverdue(d: Dependency) {
  if (!d.needed_by) return false;
  const s = d.status.toLowerCase();
  if (s === "complete" || s === "completed" || s === "resolved") return false;
  return startOfDay(new Date(d.needed_by)) < startOfDay();
}

function shortName(name: string, max = 14) {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

function DependenciesPage() {
  const { organization } = useAuth();
  const { dependencies, projects, isLoading } = useDomainData(organization?.id);
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [impactFilter, setImpactFilter] = useState("All");

  const filtered = useMemo(() => {
    return dependencies.filter((d) => {
      if (typeFilter !== "All" && d.type !== typeFilter) return false;
      if (statusFilter !== "All" && d.status !== statusFilter) return false;
      if (impactFilter !== "All" && (d.impact || "—") !== impactFilter) return false;
      return true;
    });
  }, [dependencies, typeFilter, statusFilter, impactFilter]);

  const involved = useMemo(() => {
    const names = new Set<string>();
    for (const d of filtered) {
      if (d.from_name) names.add(d.from_name);
      if (d.to_name) names.add(d.to_name);
    }
    if (names.size === 0) {
      for (const p of projects.slice(0, 12)) names.add(p.name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [filtered, projects]);

  const matrix = useMemo(() => {
    const set = new Set(filtered.map((d) => `${d.from_name}|${d.to_name}`));
    return involved.map((from) =>
      involved.map((to) => (from !== to && set.has(`${from}|${to}`) ? "→" : "")),
    );
  }, [filtered, involved]);

  const healthy = filtered.filter((d) => d.status === "Healthy").length;
  const atRisk = filtered.filter((d) => d.status === "At Risk").length;
  const blocked = filtered.filter((d) => d.status === "Blocked").length;

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="🔗"
        title="Cross-Project Dependencies"
        subtitle="Dependency matrix, network links and needed-by tracking"
      />

      <SectionFrame title="Filters">
        <div className="flex flex-wrap gap-3">
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(dependencies.map((d) => d.type))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(dependencies.map((d) => d.status))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={impactFilter}
            onChange={(e) => setImpactFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(dependencies.map((d) => d.impact || "—"))].map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </div>
      </SectionFrame>

      <SectionFrame title="Dependency KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard label="Total Links" value={filtered.length} />
          <KpiCard label="Projects Involved" value={involved.length} />
          <KpiCard label="Healthy" value={healthy} accent="#16a34a" />
          <KpiCard label="At Risk" value={atRisk} accent="#f59e0b" />
          <KpiCard label="Blocked" value={blocked} accent="#dc2626" />
        </div>
      </SectionFrame>

      <SectionFrame title="Dependency matrix">
        {filtered.length === 0 || involved.length === 0 ? (
          <EmptyState title="No dependencies" description="Dependencies appear when projects share a program or the dependencies table is seeded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table text-[11px]">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface">From \\ To</th>
                  {involved.map((n) => (
                    <th key={n} className="min-w-[64px] text-center" title={n}>
                      {shortName(n, 10)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {involved.map((from, ri) => (
                  <tr key={from}>
                    <td className="sticky left-0 bg-surface font-medium" title={from}>
                      {shortName(from)}
                    </td>
                    {matrix[ri].map((cell, ci) => (
                      <td
                        key={`${from}-${involved[ci]}`}
                        className={`text-center ${cell ? "bg-blue-50 font-bold text-blue-700" : "text-muted-foreground"}`}
                      >
                        {cell || (ri === ci ? "·" : "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionFrame>

      <SectionFrame title="Network list">
        {filtered.length === 0 ? (
          <EmptyState title="No links" />
        ) : (
          <ul className="space-y-2">
            {filtered.map((d) => {
              const color = STATUS_COLOR[d.status] || "#64748b";
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <span className="font-medium text-heading">{d.from_name || d.from_project_id}</span>
                  <span style={{ color }} className="font-bold">→</span>
                  <span className="font-medium text-heading">{d.to_name || d.to_project_id}</span>
                  <StatusChip status={d.status} />
                  <span className="text-xs text-muted-foreground">{d.type}</span>
                  {d.impact && (
                    <span className="text-xs text-muted-foreground">Impact: {d.impact}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionFrame>

      <SectionFrame title={`Dependencies register (${filtered.length})`}>
        {filtered.length === 0 ? (
          <EmptyState title="No dependencies" description="Dependencies appear when projects share a program or the dependencies table is seeded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Impact</th>
                  <th>Needed By</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const overdue = isNeededByOverdue(d);
                  return (
                    <tr key={d.id} className={overdue ? "bg-red-50/80" : undefined}>
                      <td className="font-medium">{d.from_name || "—"}</td>
                      <td className="font-medium">{d.to_name || "—"}</td>
                      <td>{d.type}</td>
                      <td><StatusChip status={d.status} /></td>
                      <td>{d.impact || "—"}</td>
                      <td className={overdue ? "font-semibold text-red-700" : undefined}>
                        {d.needed_by || "—"}
                        {overdue ? " · overdue" : ""}
                      </td>
                      <td className="max-w-[240px] truncate">{d.description || "—"}</td>
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
              "dependencies.csv",
              filtered.map((d) => ({
                from: d.from_name,
                to: d.to_name,
                type: d.type,
                status: d.status,
                impact: d.impact,
                needed_by: d.needed_by,
                description: d.description,
              })),
            )
          }
        />
      </SectionFrame>
    </div>
  );
}
