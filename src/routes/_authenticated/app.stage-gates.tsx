import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { useDomainData, type StageGate } from "@/lib/portfolio-engine";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton,
  SectionFrame, StatusChip,
} from "@/components/streamlit";
import { exportPageCsv } from "@/lib/excel";

export const Route = createFileRoute("/_authenticated/app/stage-gates")({
  component: StageGatesPage,
});

const STATUS_COLORS: Record<string, string> = {
  Approved: "#16a34a",
  "In Progress": "#1d4ed8",
  "Pending Approval": "#f59e0b",
  Rejected: "#dc2626",
  "Not Started": "#94a3b8",
  Complete: "#15803d",
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isGateOverdue(g: StageGate) {
  if (!g.planned_date) return false;
  const s = g.status.toLowerCase();
  if (s === "approved" || s === "complete" || s === "completed") return false;
  return startOfDay(new Date(g.planned_date)) < startOfDay();
}

function isCurrentGate(g: StageGate) {
  const s = g.status.toLowerCase();
  return s === "in progress" || s === "pending approval";
}

function StageGatesPage() {
  const { organization } = useAuth();
  const { stageGates, projects, isLoading } = useDomainData(organization?.id);
  const [channelFilter, setChannelFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");

  const enriched = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p]));
    return stageGates.map((g) => {
      const p = byId.get(g.project_id);
      let channel = g.governance_channel;
      if (!channel && p) {
        if (p.governance_channel) {
          channel = p.governance_channel.startsWith("Channel A") ? "Channel A" : "Channel B";
        } else {
          const funding = Number(p.approved_funding || p.capex_approved || p.budget || 0);
          channel = funding > 0 && funding <= 200_000 ? "Channel A" : "Channel B";
        }
      }
      return { ...g, governance_channel: channel || "Channel B" };
    });
  }, [stageGates, projects]);

  const filtered = useMemo(() => {
    return enriched.filter((g) => {
      if (channelFilter !== "All" && g.governance_channel !== channelFilter) return false;
      if (stageFilter !== "All" && g.stage_name !== stageFilter) return false;
      if (statusFilter !== "All" && g.status !== statusFilter) return false;
      if (projectFilter !== "All" && (g.project_name || "") !== projectFilter) return false;
      return true;
    });
  }, [enriched, channelFilter, stageFilter, statusFilter, projectFilter]);

  const total = filtered.length;
  const approved = filtered.filter((g) => g.status === "Approved").length;
  const pending = filtered.filter((g) =>
    g.status === "Pending Approval" || g.status === "In Progress",
  ).length;
  const rejected = filtered.filter((g) => g.status === "Rejected").length;
  const compliance = total > 0 ? Math.round((approved / total) * 1000) / 10 : 0;

  const statusMix = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of filtered) map.set(g.status, (map.get(g.status) || 0) + 1);
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const currentByProject = useMemo(() => {
    const groups = new Map<string, StageGate[]>();
    for (const g of filtered) {
      const key = g.project_id;
      const list = groups.get(key) || [];
      list.push(g);
      groups.set(key, list);
    }
    const rows: StageGate[] = [];
    for (const list of groups.values()) {
      const current = list.find(isCurrentGate)
        || list.find((g) => g.status === "Not Started")
        || list[list.length - 1];
      if (current) rows.push(current);
    }
    return rows.sort((a, b) => (a.project_name || "").localeCompare(b.project_name || ""));
  }, [filtered]);

  const overdueGates = useMemo(() => {
    return filtered
      .filter(isGateOverdue)
      .map((g) => {
        const days = Math.floor(
          (startOfDay().getTime() - startOfDay(new Date(g.planned_date!)).getTime()) / 86400000,
        );
        return { ...g, daysLate: days };
      })
      .sort((a, b) => b.daysLate - a.daysLate);
  }, [filtered]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="🚦"
        title="Stage Gate Management"
        subtitle="Current stage, next gate, compliance % and overdue gates per project"
      />

      <SectionFrame title="Filters">
        <div className="flex flex-wrap gap-3">
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
          >
            <option>All</option>
            <option>Channel A</option>
            <option>Channel B</option>
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(enriched.map((g) => g.stage_name))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(enriched.map((g) => g.status))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(enriched.map((g) => g.project_name).filter(Boolean))].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </SectionFrame>

      <SectionFrame title="Gate KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard label="Total Gates" value={total} />
          <KpiCard label="Approved" value={approved} accent="#16a34a" />
          <KpiCard label="Pending" value={pending} accent="#f59e0b" />
          <KpiCard label="Rejected" value={rejected} accent="#dc2626" />
          <KpiCard label="Compliance %" value={`${compliance}%`} accent="#1d4ed8" />
        </div>
      </SectionFrame>

      <SectionFrame>
        <ChartCaption title="Gate status mix" caption="Donut of gate outcomes across the filtered set">
          {statusMix.length === 0 ? (
            <EmptyState title="No gates" description="Stage gates appear once projects are loaded." />
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusMix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusMix.map((d) => (
                      <Cell key={d.name} fill={STATUS_COLORS[d.name] || "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCaption>
      </SectionFrame>

      <SectionFrame title={`Current gates per project (${currentByProject.length})`}>
        {currentByProject.length === 0 ? (
          <EmptyState title="No current gates" />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Channel</th>
                  <th>Current Stage</th>
                  <th>Next Gate</th>
                  <th>Owner</th>
                  <th>Planned</th>
                  <th>Outcome</th>
                  <th>Checklist %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentByProject.map((g) => (
                  <tr key={g.id} className={isGateOverdue(g) ? "bg-red-50/60" : undefined}>
                    <td className="font-medium">{g.project_name || "—"}</td>
                    <td>{g.governance_channel || "—"}</td>
                    <td>{g.stage_name}</td>
                    <td>{g.next_gate || "—"}</td>
                    <td>{g.gate_owner || "—"}</td>
                    <td className={isGateOverdue(g) ? "text-red-700" : undefined}>{g.planned_date || "—"}</td>
                    <td>{g.outcome || "—"}</td>
                    <td className="tabular-nums">{g.checklist_pct}%</td>
                    <td><StatusChip status={g.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "stage-gates.csv",
              currentByProject.map((g) => ({
                project: g.project_name,
                channel: g.governance_channel,
                stage: g.stage_name,
                next_gate: g.next_gate,
                owner: g.gate_owner,
                planned: g.planned_date,
                outcome: g.outcome,
                checklist_pct: g.checklist_pct,
                status: g.status,
              })),
            )
          }
        />
      </SectionFrame>

      <SectionFrame title={`Overdue gates (${overdueGates.length})`}>
        {overdueGates.length === 0 ? (
          <EmptyState title="No overdue gates" description="All open gates are within planned dates." />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Stage</th>
                  <th>Planned</th>
                  <th>Days Late</th>
                  <th>Status</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {overdueGates.map((g) => (
                  <tr key={g.id} className="bg-red-50/80">
                    <td className="font-medium text-red-800">{g.project_name || "—"}</td>
                    <td>{g.stage_name}</td>
                    <td className="text-red-700">{g.planned_date || "—"}</td>
                    <td className="font-semibold tabular-nums text-red-700">{g.daysLate}</td>
                    <td><StatusChip status={g.status} /></td>
                    <td>{g.gate_owner || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionFrame>
    </div>
  );
}
