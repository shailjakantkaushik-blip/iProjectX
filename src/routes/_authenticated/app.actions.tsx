import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { useDomainData, type ActionItem } from "@/lib/portfolio-engine";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton,
  SectionFrame, StatusChip,
} from "@/components/streamlit";
import { exportPageCsv } from "@/lib/excel";

export const Route = createFileRoute("/_authenticated/app/actions")({
  component: ActionsPage,
});

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysLate(due?: string | null): number {
  if (!due) return 0;
  const diff = startOfDay().getTime() - startOfDay(new Date(due)).getTime();
  return Math.floor(diff / 86400000);
}

function isComplete(status: string) {
  const s = status.toLowerCase();
  return s === "complete" || s === "completed" || s === "closed" || s === "done";
}

function isOverdue(a: ActionItem) {
  if (a.status === "Overdue") return true;
  if (isComplete(a.status)) return false;
  return !!a.due_date && daysLate(a.due_date) > 0;
}

function ActionsPage() {
  const { organization } = useAuth();
  const { actions, isLoading } = useDomainData(organization?.id);
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const filtered = useMemo(() => {
    return actions.filter((a) => {
      if (statusFilter !== "All" && a.status !== statusFilter) return false;
      if (priorityFilter !== "All" && a.priority !== priorityFilter) return false;
      if (ownerFilter !== "All" && (a.owner || "Unassigned") !== ownerFilter) return false;
      if (overdueOnly && !isOverdue(a)) return false;
      return true;
    });
  }, [actions, statusFilter, priorityFilter, ownerFilter, overdueOnly]);

  const weekAgo = startOfDay();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const total = filtered.length;
  const open = filtered.filter((a) => a.status === "Open" || a.status === "In Progress").length;
  const overdue = filtered.filter(isOverdue).length;
  const completedThisWeek = filtered.filter((a) => {
    if (!isComplete(a.status)) return false;
    if (!a.due_date) return true;
    const due = startOfDay(new Date(a.due_date));
    return due >= weekAgo && due <= startOfDay();
  }).length;

  const byOwner = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of filtered) {
      const owner = a.owner || "Unassigned";
      map.set(owner, (map.get(owner) || 0) + 1);
    }
    return [...map.entries()]
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const overdueRows = useMemo(() => {
    return filtered
      .filter(isOverdue)
      .map((a) => ({ ...a, daysLate: daysLate(a.due_date) }))
      .sort((a, b) => b.daysLate - a.daysLate);
  }, [filtered]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="✅"
        title="Executive Action Tracker"
        subtitle="Owner-accountable actions with due dates, priority and status"
      />

      <SectionFrame title="Filters">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(actions.map((a) => a.status))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(actions.map((a) => a.priority))].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(actions.map((a) => a.owner || "Unassigned"))].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-heading">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Overdue only
          </label>
        </div>
      </SectionFrame>

      <SectionFrame title="Action KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total" value={total} />
          <KpiCard label="Open" value={open} accent="#1d4ed8" />
          <KpiCard label="Overdue" value={overdue} accent="#dc2626" />
          <KpiCard label="Completed This Week" value={completedThisWeek} accent="#16a34a" />
        </div>
      </SectionFrame>

      <SectionFrame>
        <ChartCaption title="Actions by owner" caption="Workload distribution across action owners">
          {byOwner.length === 0 ? (
            <EmptyState title="No actions" description="Actions appear once projects are loaded or the actions table is seeded." />
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer>
                <BarChart data={byOwner} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                  <XAxis type="number" allowDecimals={false} fontSize={11} />
                  <YAxis type="category" dataKey="owner" width={120} fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1d4ed8" radius={[0, 4, 4, 0]} name="Actions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCaption>
      </SectionFrame>

      <SectionFrame title={`Overdue actions (${overdueRows.length})`}>
        {overdueRows.length === 0 ? (
          <EmptyState title="No overdue actions" description="All open actions are within due date." />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Owner</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Days Late</th>
                </tr>
              </thead>
              <tbody>
                {overdueRows.map((a) => (
                  <tr key={a.id} className="bg-red-50/80">
                    <td className="font-medium text-red-800">{a.title}</td>
                    <td>{a.project_name || "—"}</td>
                    <td>{a.owner || "Unassigned"}</td>
                    <td>{a.priority}</td>
                    <td><StatusChip status={a.status} /></td>
                    <td className="text-red-700">{a.due_date || "—"}</td>
                    <td className="font-semibold tabular-nums text-red-700">{a.daysLate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionFrame>

      <SectionFrame title={`Actions register (${filtered.length})`}>
        {filtered.length === 0 ? (
          <EmptyState title="No actions" description="Adjust filters or seed the actions table." />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Owner</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className={isOverdue(a) ? "bg-red-50/60" : undefined}>
                    <td className="font-medium">{a.title}</td>
                    <td>{a.project_name || "—"}</td>
                    <td>{a.owner || "Unassigned"}</td>
                    <td>{a.priority}</td>
                    <td><StatusChip status={a.status} /></td>
                    <td>{a.due_date || "—"}</td>
                    <td className="max-w-[200px] truncate">{a.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "actions.csv",
              filtered.map((a) => ({
                title: a.title,
                project: a.project_name,
                owner: a.owner,
                priority: a.priority,
                status: a.status,
                due_date: a.due_date,
                notes: a.notes,
              })),
            )
          }
        />
      </SectionFrame>
    </div>
  );
}
