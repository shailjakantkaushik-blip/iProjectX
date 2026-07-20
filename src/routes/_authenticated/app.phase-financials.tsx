import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/app/phase-financials")({
  component: PhaseFinancialsPage,
});

const fmtM = (n: number) => `$${(n / 1e6).toFixed(2)}M`;
const STAGES = ["Ideation", "Business Case", "Planning", "Execution", "Deployment", "Benefits"];

function PhaseFinancialsPage() {
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

  const byPhase = STAGES.map((stage) => {
    const rows = projects.filter((p) => (p.current_phase || "Ideation") === stage);
    const budget = rows.reduce((s, p) => s + Number(p.budget || 0), 0);
    const incurred = rows.reduce((s, p) => s + Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0), 0);
    const forecast = rows.reduce((s, p) => s + Number(p.capex_approved || 0) + Number(p.opex_approved || 0), 0);
    return { stage, count: rows.length, budget, incurred, forecast, remaining: budget - incurred };
  });

  const totalBudget = byPhase.reduce((s, r) => s + r.budget, 0);
  const totalIncurred = byPhase.reduce((s, r) => s + r.incurred, 0);
  const consumed = totalBudget > 0 ? (totalIncurred / totalBudget) * 100 : 0;

  return (
    <div>
      <PageHeading icon="💠">Phase Financials</PageHeading>
      <div className="text-sm text-muted-foreground mb-4">
        Budget, forecast and actuals rolled up by current stage-gate across the portfolio.
      </div>

      <SectionFrame>
        <SectionTitle>Phase KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Stages" value={STAGES.length} />
          <KpiCard label="Portfolio Budget" value={fmtM(totalBudget)} />
          <KpiCard label="Incurred" value={fmtM(totalIncurred)} />
          <KpiCard label="Consumed" value={`${consumed.toFixed(1)}%`} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Budget vs Forecast vs Actual per Phase</SectionTitle>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={byPhase}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="stage" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => fmtM(v)} />
              <Legend />
              <Bar dataKey="budget" name="Budget" fill="#1d4ed8" />
              <Bar dataKey="forecast" name="Forecast" fill="#8b5cf6" />
              <Bar dataKey="incurred" name="Actual" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Phase Register</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>Stage</th><th>Projects</th><th>Budget</th><th>Forecast</th>
                <th>Actual</th><th>Remaining</th><th>Health</th>
              </tr>
            </thead>
            <tbody>
              {byPhase.map((r) => {
                const pct = r.budget > 0 ? (r.incurred / r.budget) * 100 : 0;
                const health = pct > 100 ? "Red" : pct > 80 ? "Amber" : "Green";
                return (
                  <tr key={r.stage}>
                    <td className="font-medium">{r.stage}</td>
                    <td>{r.count}</td>
                    <td>{fmtM(r.budget)}</td>
                    <td>{fmtM(r.forecast)}</td>
                    <td>{fmtM(r.incurred)}</td>
                    <td>{fmtM(r.remaining)}</td>
                    <td><RagChip rag={health} /></td>
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
