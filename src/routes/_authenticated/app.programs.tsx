import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/app/programs")({
  component: ProgramsPage,
});

const fmtM = (n: number) => `$${(n / 1e6).toFixed(2)}M`;

function ProgramsPage() {
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

  const byProgram = new Map<string, {
    program: string; count: number; budget: number; incurred: number; forecast: number;
    red: number; amber: number; green: number;
  }>();
  for (const p of projects) {
    const key = p.program || "Unassigned";
    const row = byProgram.get(key) ?? {
      program: key, count: 0, budget: 0, incurred: 0, forecast: 0, red: 0, amber: 0, green: 0,
    };
    row.count += 1;
    row.budget += Number(p.budget || 0);
    row.incurred += Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0);
    row.forecast += Number(p.capex_approved || 0) + Number(p.opex_approved || 0);
    if (p.rag === "Red") row.red += 1;
    else if (p.rag === "Amber") row.amber += 1;
    else row.green += 1;
    byProgram.set(key, row);
  }
  const rows = [...byProgram.values()].sort((a, b) => b.budget - a.budget);

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalIncurred = rows.reduce((s, r) => s + r.incurred, 0);

  return (
    <div>
      <PageHeading icon="🎯">Programs</PageHeading>

      <SectionFrame>
        <SectionTitle>Program KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Programs" value={rows.length} />
          <KpiCard label="Projects" value={projects.length} />
          <KpiCard label="Total Budget" value={fmtM(totalBudget)} />
          <KpiCard label="Incurred" value={fmtM(totalIncurred)} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Budget vs Incurred by Program</SectionTitle>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="program" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => fmtM(v)} />
              <Legend />
              <Bar dataKey="budget" name="Budget" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="incurred" name="Incurred" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Program Register ({rows.length})</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>Program</th><th>Projects</th><th>Budget</th><th>Incurred</th><th>Forecast</th>
                <th>Consumed %</th><th>RAG mix</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const consumed = r.budget > 0 ? (r.incurred / r.budget) * 100 : 0;
                return (
                  <tr key={r.program}>
                    <td className="font-medium">{r.program}</td>
                    <td>{r.count}</td>
                    <td>{fmtM(r.budget)}</td>
                    <td>{fmtM(r.incurred)}</td>
                    <td>{fmtM(r.forecast)}</td>
                    <td>{consumed.toFixed(1)}%</td>
                    <td className="flex gap-1">
                      {r.red > 0 && <RagChip rag="Red" label={`${r.red}`} />}
                      {r.amber > 0 && <RagChip rag="Amber" label={`${r.amber}`} />}
                      {r.green > 0 && <RagChip rag="Green" label={`${r.green}`} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
