import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard } from "@/components/streamlit";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, ResponsiveContainer, CartesianGrid, Tooltip, Cell } from "recharts";

export const Route = createFileRoute("/_authenticated/app/cost-vs-benefit")({
  component: CostVsBenefitPage,
});

const fmtM = (n: number) => `$${(n / 1e6).toFixed(2)}M`;
const RAG_COLOR: Record<string, string> = { Red: "#ef4444", Amber: "#f59e0b", Green: "#22c55e" };

function CostVsBenefitPage() {
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

  const scored = projects.map((p) => {
    const cost = Number(p.budget || 0);
    const benefit = Number(p.benefits_target || 0);
    const roi = cost > 0 ? ((benefit - cost) / cost) * 100 : 0;
    return { ...p, cost, benefit, roi };
  });

  const totalCost = scored.reduce((s, p) => s + p.cost, 0);
  const totalBenefit = scored.reduce((s, p) => s + p.benefit, 0);
  const netValue = totalBenefit - totalCost;
  const portfolioRoi = totalCost > 0 ? (netValue / totalCost) * 100 : 0;

  const top10 = [...scored].sort((a, b) => b.roi - a.roi).slice(0, 10);

  return (
    <div>
      <PageHeading icon="⚖️">Cost vs Benefit</PageHeading>

      <SectionFrame>
        <SectionTitle>Portfolio Value KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total Cost" value={fmtM(totalCost)} />
          <KpiCard label="Total Benefit" value={fmtM(totalBenefit)} />
          <KpiCard label="Net Value" value={fmtM(netValue)} />
          <KpiCard label="Portfolio ROI" value={`${portfolioRoi.toFixed(1)}%`} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Cost vs Benefit (bubble = budget)</SectionTitle>
        <div className="h-80">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis type="number" dataKey="cost" name="Cost" fontSize={11}
                tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
              <YAxis type="number" dataKey="benefit" name="Benefit" fontSize={11}
                tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
              <ZAxis type="number" dataKey="cost" range={[60, 400]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }}
                formatter={(v: number) => fmtM(v)}
                labelFormatter={() => ""} />
              <Scatter data={scored}>
                {scored.map((p, i) => (
                  <Cell key={i} fill={RAG_COLOR[p.rag || "Green"] || "#3b82f6"} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Top 10 Projects by ROI</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>#</th><th>Project</th><th>Program</th><th>Cost</th>
                <th>Benefit</th><th>Net</th><th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td className="font-medium">{p.name}</td>
                  <td>{p.program || "—"}</td>
                  <td>{fmtM(p.cost)}</td>
                  <td>{fmtM(p.benefit)}</td>
                  <td>{fmtM(p.benefit - p.cost)}</td>
                  <td>{p.roi.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
