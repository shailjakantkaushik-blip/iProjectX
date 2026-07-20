import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { useDomainData } from "@/lib/domain";
import { fmtMoney } from "@/lib/portfolio-engine";
import { exportPageCsv } from "@/lib/ppt-export";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton,
  SectionFrame, StatusChip,
} from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/resources")({
  component: ResourcesPage,
});

function utilColor(pct: number): string {
  if (pct <= 0) return "#f1f5f9";
  if (pct > 100) {
    const t = Math.min(1, (pct - 100) / 50);
    return `color-mix(in srgb, #dc2626 ${Math.round(55 + t * 45)}%, #fef2f2)`;
  }
  // 0–100%: green → amber
  const t = pct / 100;
  return `color-mix(in srgb, #f59e0b ${Math.round(t * 70)}%, #16a34a)`;
}

function ResourcesPage() {
  const { organization } = useAuth();
  const { resources, projects, isLoading } = useDomainData(organization?.id);
  const [skillFilter, setSkillFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");

  const skills = useMemo(
    () => [...new Set(resources.map((r) => r.skill).filter(Boolean) as string[])].sort(),
    [resources],
  );
  const roles = useMemo(
    () => [...new Set(resources.map((r) => r.role).filter(Boolean) as string[])].sort(),
    [resources],
  );

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (skillFilter !== "All" && r.skill !== skillFilter) return false;
      if (roleFilter !== "All" && r.role !== roleFilter) return false;
      return true;
    });
  }, [resources, skillFilter, roleFilter]);

  const peopleRows = useMemo(() => {
    type Acc = {
      person: string;
      skill: string;
      role: string;
      projects: Set<string>;
      byMonth: Map<string, number>;
    };
    const map = new Map<string, Acc>();
    for (const r of filtered) {
      const key = r.resource_name;
      let acc = map.get(key);
      if (!acc) {
        acc = {
          person: key,
          skill: r.skill || "—",
          role: r.role || "—",
          projects: new Set(),
          byMonth: new Map(),
        };
        map.set(key, acc);
      }
      if (r.project_name) acc.projects.add(r.project_name);
      if (r.skill) acc.skill = r.skill;
      if (r.role) acc.role = r.role;
      const monthKey = (r.month || "").slice(0, 7);
      if (monthKey) {
        acc.byMonth.set(monthKey, (acc.byMonth.get(monthKey) || 0) + Number(r.allocation_pct || 0));
      }
    }
    return [...map.values()]
      .map((a) => {
        const months = [...a.byMonth.values()];
        const util = months.length
          ? months.reduce((s, v) => s + v, 0) / months.length
          : 0;
        return {
          person: a.person,
          skill: a.skill,
          role: a.role,
          projects: [...a.projects].sort(),
          util: Math.round(util * 10) / 10,
          byMonth: a.byMonth,
          status: util > 100 ? "Over" : util >= 60 ? "Optimal" : "Under",
        };
      })
      .sort((a, b) => b.util - a.util);
  }, [filtered]);

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const r of filtered) {
      const m = (r.month || "").slice(0, 7);
      if (m) set.add(m);
    }
    return [...set].sort();
  }, [filtered]);

  const totalPeople = peopleRows.length;
  const avgUtil = totalPeople
    ? peopleRows.reduce((s, p) => s + p.util, 0) / totalPeople
    : 0;
  const totalFte = Math.round((peopleRows.reduce((s, p) => s + p.util, 0) / 100) * 10) / 10;
  const overCount = peopleRows.filter((p) => p.util > 100).length;

  const bySponsor = useMemo(() => {
    return Array.from(
      projects
        .reduce((m: Map<string, { sponsor: string; count: number; budget: number }>, p) => {
          const k = p.sponsor || "Unassigned";
          const cur = m.get(k) || { sponsor: k, count: 0, budget: 0 };
          cur.count++;
          cur.budget += Number(p.budget || 0);
          m.set(k, cur);
          return m;
        }, new Map())
        .values(),
    ).sort((a, b) => b.count - a.count);
  }, [projects]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="👥"
        title="Resource Capacity & Skill Intelligence"
        subtitle="Person × month utilisation · skill / role filters · sponsor load"
      />

      <SectionFrame title="Filters">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Skill
            <select
              className="h-9 min-w-[140px] rounded-md border border-border bg-surface px-2 text-sm text-heading"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
            >
              <option>All</option>
              {skills.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Role
            <select
              className="h-9 min-w-[140px] rounded-md border border-border bg-surface px-2 text-sm text-heading"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option>All</option>
              {roles.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </SectionFrame>

      <SectionFrame title="Resource KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total People" value={totalPeople} />
          <KpiCard label="Total FTE" value={totalFte.toFixed(1)} />
          <KpiCard label="Avg Utilisation %" value={`${avgUtil.toFixed(0)}%`} />
          <KpiCard label="Over-allocated Count" value={overCount} accent="#dc2626" />
        </div>
      </SectionFrame>

      <SectionFrame>
        <ChartCaption
          title="Utilisation heatmap — Person × Month"
          caption="Cell colour green→amber→red; red when allocation >100% (scale 0–150%)"
        >
          {peopleRows.length === 0 || months.length === 0 ? (
            <EmptyState title="No resource allocations" description="Allocations appear once projects load or resource_allocations is seeded." />
          ) : (
            <div
              className="overflow-x-auto"
              style={{
                display: "grid",
                gridTemplateColumns: `140px repeat(${months.length}, minmax(64px, 1fr))`,
                gap: 4,
              }}
            >
              <div />
              {months.map((m) => (
                <div key={m} className="text-center text-[10px] font-semibold text-muted-foreground">
                  {m}
                </div>
              ))}
              {peopleRows.map((p) => (
                <Fragment key={p.person}>
                  <div className="truncate pr-2 text-[11px] font-medium text-heading" title={p.person}>
                    {p.person}
                  </div>
                  {months.map((m) => {
                    const pct = Math.min(150, p.byMonth.get(m) || 0);
                    return (
                      <div
                        key={`${p.person}-${m}`}
                        className="flex h-9 items-center justify-center rounded-md text-[11px] font-bold text-heading"
                        style={{ background: utilColor(pct) }}
                        title={`${p.person} · ${m}: ${pct}%`}
                      >
                        {pct ? Math.round(pct) : ""}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          )}
        </ChartCaption>
      </SectionFrame>

      <SectionFrame>
        <ChartCaption title="Load by sponsor" caption="Project count aggregated from the portfolio">
          <div className="h-72">
            {bySponsor.length === 0 ? (
              <EmptyState title="No sponsors" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={bySponsor} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                  <XAxis type="number" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="sponsor" width={120} fontSize={10} />
                  <Tooltip
                    formatter={(v, name) =>
                      name === "budget" ? fmtMoney(Number(v)) : v
                    }
                  />
                  <Bar dataKey="count" name="Projects" radius={[0, 4, 4, 0]}>
                    {bySponsor.map((d) => (
                      <Cell key={d.sponsor} fill="#1d4ed8" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCaption>
      </SectionFrame>

      <SectionFrame title={`Resource register (${peopleRows.length})`}>
        {peopleRows.length === 0 ? (
          <EmptyState title="No people" description="Adjust filters or wait for resource data." />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Skill</th>
                  <th>Role</th>
                  <th>Allocated Projects</th>
                  <th className="text-right">Utilisation %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {peopleRows.map((p) => (
                  <tr key={p.person}>
                    <td className="font-medium">{p.person}</td>
                    <td>{p.skill}</td>
                    <td>{p.role}</td>
                    <td className="max-w-[280px] truncate" title={p.projects.join(", ")}>
                      {p.projects.length ? p.projects.join(", ") : "—"}
                    </td>
                    <td
                      className="text-right tabular-nums font-semibold"
                      style={{ color: p.util > 100 ? "#dc2626" : undefined }}
                    >
                      {p.util.toFixed(0)}%
                    </td>
                    <td>
                      <StatusChip status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "resources.csv",
              peopleRows.map((p) => ({
                person: p.person,
                skill: p.skill,
                role: p.role,
                projects: p.projects.join("; "),
                utilisation_pct: p.util,
                status: p.status,
              })),
            )
          }
        />
      </SectionFrame>
    </div>
  );
}
