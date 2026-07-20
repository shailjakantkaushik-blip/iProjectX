import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/stage-gates")({
  component: StageGatesPage,
});

const STAGES = ["Idea", "Discovery", "Definition", "Design", "Build", "Test", "Deploy", "Closure"];
const STAGE_COLORS = ["#94a3b8", "#60a5fa", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#22c55e", "#15803d"];

function StageGatesPage() {
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

  const stageCounts = STAGES.map((s, i) => ({
    stage: s,
    count: projects.filter((p) => (p.current_phase || "").toLowerCase() === s.toLowerCase()).length,
    fill: STAGE_COLORS[i],
  }));

  const gatePending = projects.filter((p) => p.rag !== "Green" && p.status !== "Completed").length;
  const gatePassed = projects.filter((p) => p.status === "Completed").length;
  const overdue = projects.filter((p) => p.end_date && new Date(p.end_date) < new Date() && p.status !== "Completed").length;

  return (
    <div>
      <PageHeading icon="🚦">Stage Gates</PageHeading>

      <SectionFrame>
        <SectionTitle>Gate KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total Projects" value={projects.length} />
          <KpiCard label="Gates Passed" value={gatePassed} />
          <KpiCard label="Gates Pending Review" value={gatePending} />
          <KpiCard label="Overdue" value={overdue} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Gate Distribution</SectionTitle>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={stageCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="stage" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stageCounts.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Stage Gate Register</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>Project</th><th>Program</th><th>Current Gate</th><th>Status</th>
                <th>RAG</th><th>Sponsor</th><th>Target Go-Live</th><th>End</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td>{p.program || "—"}</td>
                  <td>{p.current_phase || "—"}</td>
                  <td>{p.status}</td>
                  <td><RagChip rag={p.rag} /></td>
                  <td>{p.sponsor || "—"}</td>
                  <td>{p.target_go_live || "—"}</td>
                  <td>{p.end_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
