import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useDomainData, type Decision } from "@/lib/portfolio-engine";
import {
  EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton,
  SectionFrame, StatusChip,
} from "@/components/streamlit";
import { exportPageCsv } from "@/lib/excel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/decisions")({
  component: DecisionsPage,
});

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isClosed(status: string) {
  const s = status.toLowerCase();
  return s === "approved" || s === "rejected" || s === "closed";
}

function isAwaiting(status: string) {
  const s = status.toLowerCase();
  return s === "open" || s === "in review" || s === "pending";
}

function isOverdue(d: Decision) {
  if (isClosed(d.status)) return false;
  if (!d.due_date) return false;
  return startOfDay(new Date(d.due_date)) < startOfDay();
}

function DecisionsTable({ rows }: { rows: Decision[] }) {
  if (rows.length === 0) {
    return <EmptyState title="No decisions" description="No decisions match the current filters." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="st-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Project</th>
            <th>Owner</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Due</th>
            <th>Outcome</th>
            <th>Rationale</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className={isOverdue(d) ? "bg-red-50/60" : undefined}>
              <td className="font-medium">{d.title}</td>
              <td>{d.type}</td>
              <td>{d.project_name || "—"}</td>
              <td>{d.decision_maker || "—"}</td>
              <td>{d.priority || "—"}</td>
              <td><StatusChip status={d.status} /></td>
              <td className={isOverdue(d) ? "font-medium text-red-700" : undefined}>{d.due_date || "—"}</td>
              <td>{d.outcome || "—"}</td>
              <td className="max-w-[220px] truncate">{d.rationale || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DecisionsPage() {
  const { organization } = useAuth();
  const { decisions, isLoading } = useDomainData(organization?.id);
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");

  const filtered = useMemo(() => {
    return decisions.filter((d) => {
      if (typeFilter !== "All" && d.type !== typeFilter) return false;
      if (statusFilter !== "All" && d.status !== statusFilter) return false;
      if (priorityFilter !== "All" && (d.priority || "—") !== priorityFilter) return false;
      if (ownerFilter !== "All" && (d.decision_maker || "Unassigned") !== ownerFilter) return false;
      return true;
    });
  }, [decisions, typeFilter, statusFilter, priorityFilter, ownerFilter]);

  const total = filtered.length;
  const awaiting = filtered.filter((d) => isAwaiting(d.status)).length;
  const overdue = filtered.filter(isOverdue).length;
  const approved = filtered.filter((d) => d.status === "Approved").length;

  const byType = useMemo(() => {
    const map = new Map<string, Decision[]>();
    for (const d of filtered) {
      const t = d.type || "Other";
      const list = map.get(t) || [];
      list.push(d);
      map.set(t, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="🧭"
        title="Key Decisions Register"
        subtitle="Project, program, funding, architecture and SteerCo decisions"
      />

      <SectionFrame title="Filters">
        <div className="flex flex-wrap gap-3">
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(decisions.map((d) => d.type))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(decisions.map((d) => d.status))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(decisions.map((d) => d.priority || "—"))].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(decisions.map((d) => d.decision_maker || "Unassigned"))].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      </SectionFrame>

      <SectionFrame title="Decision KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total" value={total} />
          <KpiCard label="Awaiting" value={awaiting} accent="#f59e0b" />
          <KpiCard label="Overdue" value={overdue} accent="#dc2626" />
          <KpiCard label="Approved" value={approved} accent="#16a34a" />
        </div>
      </SectionFrame>

      <SectionFrame title="Decisions">
        <Tabs defaultValue="all">
          <TabsList className="mb-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="by-type">By Type</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <DecisionsTable rows={filtered} />
          </TabsContent>
          <TabsContent value="overdue">
            {overdue === 0 ? (
              <EmptyState title="No overdue decisions" description="All open decisions are within due date." />
            ) : (
              <DecisionsTable rows={filtered.filter(isOverdue)} />
            )}
          </TabsContent>
          <TabsContent value="by-type">
            {byType.length === 0 ? (
              <EmptyState title="No decisions" description="Decisions appear once projects are loaded or the decisions table is seeded." />
            ) : (
              <div className="space-y-4">
                {byType.map(([type, rows]) => (
                  <div key={type}>
                    <div className="mb-2 text-sm font-semibold text-heading">
                      {type} — {rows.length}
                    </div>
                    <DecisionsTable rows={rows} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "decisions.csv",
              filtered.map((d) => ({
                title: d.title,
                type: d.type,
                project: d.project_name,
                owner: d.decision_maker,
                priority: d.priority,
                status: d.status,
                due_date: d.due_date,
                outcome: d.outcome,
                rationale: d.rationale,
              })),
            )
          }
        />
      </SectionFrame>
    </div>
  );
}
