import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/app/portfolio-movements")({
  component: MovementsPage,
});

const fmtM = (n: number) => `$${(n / 1e6).toFixed(2)}M`;

function MovementsPage() {
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

  const movements = projects.map((p: any) => {
    const budget = Number(p.budget || 0);
    const forecast = Number(p.capex_approved || 0) + Number(p.opex_approved || 0);
    const delta = forecast - budget;
    return {
      id: p.project_id || p.id,
      name: p.name,
      program: p.program || "—",
      rag: p.rag || "Green",
      budget,
      forecast,
      delta,
      pct: budget ? (delta / budget) * 100 : 0,
    };
  });

  const upward = movements.filter((m) => m.delta > 0);
  const downward = movements.filter((m) => m.delta < 0);
  const stable = movements.filter((m) => m.delta === 0);

  const topMovers = [...movements]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 10);

  const chartData = topMovers.map((m) => ({ name: m.id, delta: m.delta / 1e6 }));

  return (
    <div className="space-y-6">
      <PageHeading title="Portfolio Movements" subtitle="Budget vs forecast variance and rebaselines" />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Total Projects" value={projects.length} />
        <KpiCard label="Increasing" value={upward.length} accent="var(--st-danger)" />
        <KpiCard label="Decreasing" value={downward.length} accent="var(--st-success)" />
        <KpiCard label="Stable" value={stable.length} />
      </div>

      <SectionFrame>
        <SectionTitle>Top 10 Budget Movers ($M)</SectionTitle>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--st-border)" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}M`} />
            <Legend />
            <Bar dataKey="delta" name="Delta (Forecast - Budget)" fill="var(--st-accent)" />
          </BarChart>
        </ResponsiveContainer>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Movement Register</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>ID</th><th>Project</th><th>Program</th><th>RAG</th>
                <th className="text-right">Budget</th><th className="text-right">Forecast</th>
                <th className="text-right">Delta</th><th className="text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.name}</td>
                  <td>{m.program}</td>
                  <td><RagChip rag={m.rag as any} /></td>
                  <td className="text-right">{fmtM(m.budget)}</td>
                  <td className="text-right">{fmtM(m.forecast)}</td>
                  <td className="text-right" style={{ color: m.delta > 0 ? "var(--st-danger)" : m.delta < 0 ? "var(--st-success)" : undefined }}>
                    {fmtM(m.delta)}
                  </td>
                  <td className="text-right">{m.pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
