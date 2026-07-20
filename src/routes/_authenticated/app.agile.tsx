import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard } from "@/components/streamlit";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/app/agile")({ component: Page });

const COLORS = ["#1d4ed8", "#15803d", "#f59e0b", "#8b5cf6", "#06b6d4"];

function Page() {
  const { organization } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-agile", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!organization,
  });

  const agile = projects.filter((p: any) => (p.delivery_method || "").toLowerCase() === "agile");
  const waterfall = projects.filter((p: any) => (p.delivery_method || "").toLowerCase() === "waterfall");
  const hybrid = projects.filter((p: any) => {
    const m = (p.delivery_method || "").toLowerCase();
    return m && m !== "agile" && m !== "waterfall";
  });

  // Synthetic velocity per program (until sprints table exists)
  const byProgram: Record<string, { program: string; committed: number; delivered: number }> = {};
  agile.forEach((p: any) => {
    const key = p.program || "Unassigned";
    byProgram[key] ||= { program: key, committed: 0, delivered: 0 };
    byProgram[key].committed += Number(p.capex_approved || 0) / 10000;
    byProgram[key].delivered += Number(p.capex_incurred || 0) / 10000;
  });
  const velocityData = Object.values(byProgram);

  const methodMix = [
    { name: "Agile", value: agile.length },
    { name: "Waterfall", value: waterfall.length },
    { name: "Hybrid", value: hybrid.length },
  ].filter((d) => d.value > 0);

  const totalCommitted = velocityData.reduce((s, d) => s + d.committed, 0);
  const totalDelivered = velocityData.reduce((s, d) => s + d.delivered, 0);
  const sayDo = totalCommitted > 0 ? (totalDelivered / totalCommitted) * 100 : 0;

  return (
    <div>
      <PageHeading icon="🌀" title="31 · Agile" subtitle="Sprint velocity, say/do ratio, and delivery-method mix across the portfolio." />

      <div className="grid gap-3 md:grid-cols-4 mb-3">
        <KpiCard label="Agile Projects" value={agile.length} accent="#1d4ed8" />
        <KpiCard label="Waterfall Projects" value={waterfall.length} accent="#15803d" />
        <KpiCard label="Hybrid Projects" value={hybrid.length} accent="#f59e0b" />
        <KpiCard label="Say / Do Ratio" value={`${sayDo.toFixed(0)}%`} accent="#8b5cf6" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SectionFrame>
          <SectionTitle>Delivery Method Mix</SectionTitle>
          <div style={{ height: 280 }}>
            {methodMix.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No delivery-method data</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={methodMix} dataKey="value" nameKey="name" outerRadius={90} label>
                    {methodMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionFrame>

        <SectionFrame>
          <SectionTitle>Velocity by Program (committed vs delivered)</SectionTitle>
          <div style={{ height: 280 }}>
            {velocityData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No agile programs</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="program" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="committed" fill="#1d4ed8" name="Committed pts" />
                  <Bar dataKey="delivered" fill="#15803d" name="Delivered pts" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionFrame>
      </div>

      <SectionFrame>
        <SectionTitle>Agile Register</SectionTitle>
        <div className="overflow-auto">
          <table className="st-table">
            <thead><tr><th>Project ID</th><th>Name</th><th>Program</th><th>Sponsor</th><th>Sprint Cadence</th><th>RAG</th></tr></thead>
            <tbody>
              {agile.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-6">No agile projects yet — set Delivery Method to Agile in Projects.</td></tr>
              ) : agile.map((p: any) => (
                <tr key={p.id}>
                  <td>{p.project_code || "—"}</td>
                  <td>{p.name}</td>
                  <td>{p.program || "—"}</td>
                  <td>{p.sponsor || "—"}</td>
                  <td>2-week</td>
                  <td>{p.rag || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
