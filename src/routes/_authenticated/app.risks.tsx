import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/risks")({
  component: RisksPage,
});

const RAG_COLORS: Record<string, string> = { Green: "#15803d", Amber: "#f59e0b", Red: "#dc2626" };
const PRIO_SCORE: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const RAG_SCORE: Record<string, number> = { Red: 3, Amber: 2, Green: 1 };

function RisksPage() {
  const { organization } = useAuth();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!organization,
  });

  const risky = projects.filter((p) => p.rag === "Red" || p.rag === "Amber");
  const red = projects.filter((p) => p.rag === "Red").length;
  const amber = projects.filter((p) => p.rag === "Amber").length;
  const green = projects.filter((p) => p.rag === "Green").length;
  const criticalOverdue = projects.filter(
    (p) => p.priority === "Critical" && p.end_date && new Date(p.end_date) < new Date() && p.status !== "Completed",
  ).length;

  const ragData = [
    { name: "Green", value: green },
    { name: "Amber", value: amber },
    { name: "Red", value: red },
  ].filter((d) => d.value > 0);

  const byProgram = Array.from(
    projects.reduce((m: Map<string, { program: string; red: number; amber: number; green: number }>, p) => {
      const k = p.program || "Unassigned";
      const cur = m.get(k) || { program: k, red: 0, amber: 0, green: 0 };
      if (p.rag === "Red") cur.red++;
      else if (p.rag === "Amber") cur.amber++;
      else if (p.rag === "Green") cur.green++;
      m.set(k, cur);
      return m;
    }, new Map()).values(),
  );

  const heatmap = projects
    .filter((p) => p.priority && p.rag)
    .map((p) => ({
      x: PRIO_SCORE[p.priority as string] || 1,
      y: RAG_SCORE[p.rag as string] || 1,
      z: Number(p.budget || 0),
      name: p.name,
    }));

  return (
    <div>
      <PageHeading icon="⚠️">Risk Intelligence</PageHeading>

      <SectionFrame>
        <SectionTitle>Risk KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard label="Red" value={red} />
          <KpiCard label="Amber" value={amber} />
          <KpiCard label="Green" value={green} />
          <KpiCard label="At-Risk" value={risky.length} />
          <KpiCard label="Critical Overdue" value={criticalOverdue} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Risk Distribution</SectionTitle>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartBox title="RAG Split">
              <PieChart>
                <Pie data={ragData} dataKey="value" nameKey="name" outerRadius={70} label>
                  {ragData.map((e) => <Cell key={e.name} fill={RAG_COLORS[e.name]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ChartBox>

            <ChartBox title="RAG by Program">
              <BarChart data={byProgram}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
                <XAxis dataKey="program" fontSize={10} />
                <YAxis allowDecimals={false} fontSize={10} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="red" stackId="a" fill="#dc2626" />
                <Bar dataKey="amber" stackId="a" fill="#f59e0b" />
                <Bar dataKey="green" stackId="a" fill="#15803d" />
              </BarChart>
            </ChartBox>

            <ChartBox title="Priority × RAG (bubble = budget)">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
                <XAxis dataKey="x" name="Priority" fontSize={10} type="number" domain={[0, 5]}
                  ticks={[1, 2, 3, 4]} tickFormatter={(v) => ["", "Low", "Med", "High", "Crit"][v] || ""} />
                <YAxis dataKey="y" name="RAG" fontSize={10} type="number" domain={[0, 4]}
                  ticks={[1, 2, 3]} tickFormatter={(v) => ["", "G", "A", "R"][v] || ""} />
                <ZAxis dataKey="z" range={[40, 400]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v: any, n) => n === "z" ? `$${Number(v).toLocaleString()}` : v} />
                <Scatter data={heatmap} fill="#1d4ed8" />
              </ScatterChart>
            </ChartBox>
          </div>
        )}
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>At-Risk Register ({risky.length})</SectionTitle>
        {risky.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No projects flagged Amber or Red 🎉</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Project</th><th>Program</th><th>Sponsor</th><th>Priority</th>
                  <th>RAG</th><th>Status</th><th>End Date</th><th className="text-right">Budget</th>
                </tr>
              </thead>
              <tbody>
                {risky.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.program || "—"}</td>
                    <td>{p.sponsor || "—"}</td>
                    <td>{p.priority || "—"}</td>
                    <td><RagChip rag={p.rag} /></td>
                    <td>{p.status}</td>
                    <td>{p.end_date || "—"}</td>
                    <td className="text-right tabular-nums">${Number(p.budget || 0).toLocaleString()}</td>
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

function ChartBox({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-md border border-border bg-surface p-2">
      <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="h-56"><ResponsiveContainer>{children}</ResponsiveContainer></div>
    </div>
  );
}
