import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/actions")({
  component: ActionsPage,
});

/**
 * Actions are derived from Amber/Red projects — each risky project is one open action.
 * A dedicated `actions` table can be added later without changing this UI.
 */
function ActionsPage() {
  const { organization } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!organization,
  });

  const today = new Date();
  const actions = projects
    .filter((p) => p.rag === "Amber" || p.rag === "Red" || (p.end_date && new Date(p.end_date) < today && p.status !== "Completed"))
    .map((p) => {
      const overdue = p.end_date && new Date(p.end_date) < today && p.status !== "Completed";
      const priority = p.rag === "Red" || overdue ? "High" : p.rag === "Amber" ? "Medium" : "Low";
      const status = p.status === "Completed" ? "Closed" : overdue ? "Overdue" : "Open";
      return {
        project: p.name,
        owner: p.sponsor || "Unassigned",
        due: p.end_date,
        priority,
        status,
        rag: p.rag,
      };
    });

  const open = actions.filter((a) => a.status === "Open").length;
  const overdue = actions.filter((a) => a.status === "Overdue").length;
  const closed = actions.filter((a) => a.status === "Closed").length;
  const high = actions.filter((a) => a.priority === "High").length;

  const byPriority = ["High", "Medium", "Low"].map((p) => ({
    name: p, value: actions.filter((a) => a.priority === p).length,
  })).filter((d) => d.value > 0);
  const PRIO_COLORS: Record<string, string> = { High: "#dc2626", Medium: "#f59e0b", Low: "#15803d" };

  const byOwner = Array.from(
    actions.reduce((m: Map<string, number>, a) => m.set(a.owner, (m.get(a.owner) || 0) + 1), new Map()).entries(),
  ).map(([owner, count]) => ({ owner, count })).sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <div>
      <PageHeading icon="✅">Actions Register</PageHeading>

      <SectionFrame>
        <SectionTitle>Action KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Open" value={open} />
          <KpiCard label="Overdue" value={overdue} />
          <KpiCard label="High Priority" value={high} />
          <KpiCard label="Closed" value={closed} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Action Analytics</SectionTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-surface p-2">
            <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">By Priority</div>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byPriority} dataKey="value" nameKey="name" outerRadius={70} label>
                    {byPriority.map((e) => <Cell key={e.name} fill={PRIO_COLORS[e.name]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface p-2">
            <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Load by Owner (Top 8)</div>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={byOwner} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
                  <XAxis type="number" allowDecimals={false} fontSize={10} />
                  <YAxis type="category" dataKey="owner" fontSize={10} width={110} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Actions Register ({actions.length})</SectionTitle>
        {actions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No open actions 🎉</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Project</th><th>Owner</th><th>Priority</th><th>Status</th><th>RAG</th><th>Due</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a, i) => (
                  <tr key={i}>
                    <td className="font-medium">{a.project}</td>
                    <td>{a.owner}</td>
                    <td>{a.priority}</td>
                    <td>{a.status}</td>
                    <td><RagChip rag={a.rag} /></td>
                    <td>{a.due || "—"}</td>
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
