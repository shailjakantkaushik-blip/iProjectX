import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, ResponsiveContainer, CartesianGrid, Tooltip, Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/prioritisation")({
  component: PrioritisationPage,
});

const PRIO_SCORE: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const RAG_COLORS: Record<string, string> = { Green: "#15803d", Amber: "#f59e0b", Red: "#dc2626" };

function PrioritisationPage() {
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

  // Score = weighted(priority 40%, benefits/budget 40%, ROI 20%)
  const scored = projects.map((p) => {
    const prio = PRIO_SCORE[p.priority || "Medium"] || 2;
    const bud = Number(p.budget || 0);
    const ben = Number(p.benefits_target || 0);
    const roi = Number(p.roi_percent || 0);
    const benefitRatio = bud > 0 ? ben / bud : 0;
    const score = prio * 25 + Math.min(benefitRatio * 20, 40) + Math.min(roi / 5, 20);
    return {
      id: p.id,
      name: p.name,
      program: p.program || "Unassigned",
      priority: p.priority || "Medium",
      rag: p.rag,
      budget: bud,
      benefits: ben,
      roi,
      score: Math.round(score * 10) / 10,
      x: bud,
      y: ben,
      z: prio * 40,
    };
  }).sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 10);

  return (
    <div>
      <PageHeading icon="🎯">Prioritisation Matrix</PageHeading>

      <SectionFrame>
        <SectionTitle>Prioritisation KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Projects Scored" value={scored.length} />
          <KpiCard label="Top Score" value={scored[0]?.score ?? "—"} />
          <KpiCard label="Median Score" value={scored.length ? scored[Math.floor(scored.length / 2)].score : "—"} />
          <KpiCard label="Critical Priority" value={projects.filter((p) => p.priority === "Critical").length} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Cost vs Benefit (bubble = priority)</SectionTitle>
        <div className="h-72">
          <ResponsiveContainer>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis type="number" dataKey="x" name="Budget" fontSize={10}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="number" dataKey="y" name="Benefits" fontSize={10}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <ZAxis type="number" dataKey="z" range={[60, 400]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }}
                formatter={(v: any, n: any) => (n === "x" || n === "y") ? `$${Number(v).toLocaleString()}` : v}
                labelFormatter={(_, p: any) => p?.[0]?.payload?.name ?? ""} />
              <Scatter data={scored}>
                {scored.map((e) => <Cell key={e.id} fill={RAG_COLORS[e.rag || "Green"] || "#94a3b8"} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Top 10 by Composite Score</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>#</th><th>Project</th><th>Program</th><th>Priority</th><th>RAG</th>
                <th className="text-right">Budget</th><th className="text-right">Benefits</th>
                <th className="text-right">ROI %</th><th className="text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {top.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td className="font-medium">{p.name}</td>
                  <td>{p.program}</td>
                  <td>{p.priority}</td>
                  <td><RagChip rag={p.rag} /></td>
                  <td className="text-right tabular-nums">${p.budget.toLocaleString()}</td>
                  <td className="text-right tabular-nums">${p.benefits.toLocaleString()}</td>
                  <td className="text-right tabular-nums">{p.roi.toFixed(1)}%</td>
                  <td className="text-right tabular-nums font-semibold">{p.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
