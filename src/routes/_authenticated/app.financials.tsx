import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard } from "@/components/streamlit";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/financials")({
  component: FinancialsPage,
});

const money = (n: number) =>
  "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n || 0);

function FinancialsPage() {
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

  const capexApproved = projects.reduce((s, p) => s + Number(p.capex_approved || 0), 0);
  const capexIncurred = projects.reduce((s, p) => s + Number(p.capex_incurred || 0), 0);
  const opexApproved = projects.reduce((s, p) => s + Number(p.opex_approved || 0), 0);
  const opexIncurred = projects.reduce((s, p) => s + Number(p.opex_incurred || 0), 0);
  const benefitsTarget = projects.reduce((s, p) => s + Number(p.benefits_target || 0), 0);
  const benefitsRealised = projects.reduce((s, p) => s + Number(p.benefits_realised || 0), 0);
  const totalBudget = projects.reduce((s, p) => s + Number(p.budget || 0), 0);
  const totalIncurred = capexIncurred + opexIncurred;
  const totalApproved = capexApproved + opexApproved;
  const spendPct = totalApproved > 0 ? (totalIncurred / totalApproved) * 100 : 0;
  const cpi = totalIncurred > 0 ? (benefitsRealised || totalApproved) / totalIncurred : 0;

  const byProgram = Array.from(
    projects.reduce((m: Map<string, any>, p) => {
      const k = p.program || "Unassigned";
      const cur = m.get(k) || { program: k, capex: 0, opex: 0, incurred: 0, budget: 0 };
      cur.capex += Number(p.capex_approved || 0);
      cur.opex += Number(p.opex_approved || 0);
      cur.incurred += Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0);
      cur.budget += Number(p.budget || 0);
      m.set(k, cur);
      return m;
    }, new Map()).values(),
  );

  const runRate = projects
    .filter((p) => p.start_date)
    .slice(0, 12)
    .map((p) => ({
      name: (p.name || "").slice(0, 12),
      capex: Number(p.capex_incurred || 0),
      opex: Number(p.opex_incurred || 0),
    }));

  return (
    <div>
      <PageHeading icon="💰">Financial Intelligence — CAPEX / OPEX + EVM</PageHeading>

      <SectionFrame>
        <SectionTitle>Financial KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <KpiCard label="CAPEX Approved" value={money(capexApproved)} />
          <KpiCard label="CAPEX Incurred" value={money(capexIncurred)} />
          <KpiCard label="OPEX Approved" value={money(opexApproved)} />
          <KpiCard label="OPEX Incurred" value={money(opexIncurred)} />
          <KpiCard label="Total Budget" value={money(totalBudget)} />
          <KpiCard label="Total Incurred" value={money(totalIncurred)} />
          <KpiCard label="Spend %" value={`${spendPct.toFixed(1)}%`} />
          <KpiCard label="Benefits Realised" value={money(benefitsRealised)} sub={`of ${money(benefitsTarget)} target`} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>CAPEX vs OPEX by Program</SectionTitle>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={byProgram}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="program" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={money} />
              <Tooltip formatter={(v: any) => money(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="capex" fill="#1d4ed8" name="CAPEX Approved" radius={[4, 4, 0, 0]} />
              <Bar dataKey="opex" fill="#15803d" name="OPEX Approved" radius={[4, 4, 0, 0]} />
              <Bar dataKey="incurred" fill="#f59e0b" name="Incurred" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Spend Run-Rate (top 12 projects)</SectionTitle>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={runRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="name" fontSize={10} />
              <YAxis fontSize={11} tickFormatter={money} />
              <Tooltip formatter={(v: any) => money(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="capex" stroke="#1d4ed8" strokeWidth={2} />
              <Line type="monotone" dataKey="opex" stroke="#15803d" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Project Financials</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>Project</th><th>Program</th>
                <th className="text-right">Budget</th>
                <th className="text-right">CAPEX Appr.</th>
                <th className="text-right">CAPEX Incd.</th>
                <th className="text-right">OPEX Appr.</th>
                <th className="text-right">OPEX Incd.</th>
                <th className="text-right">Benefits</th>
                <th className="text-right">ROI %</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const inc = Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0);
                const ben = Number(p.benefits_realised || 0);
                const roi = inc > 0 ? ((ben - inc) / inc) * 100 : 0;
                return (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.program || "—"}</td>
                    <td className="text-right tabular-nums">{money(Number(p.budget || 0))}</td>
                    <td className="text-right tabular-nums">{money(Number(p.capex_approved || 0))}</td>
                    <td className="text-right tabular-nums">{money(Number(p.capex_incurred || 0))}</td>
                    <td className="text-right tabular-nums">{money(Number(p.opex_approved || 0))}</td>
                    <td className="text-right tabular-nums">{money(Number(p.opex_incurred || 0))}</td>
                    <td className="text-right tabular-nums">{money(ben)}</td>
                    <td className={"text-right tabular-nums " + (roi >= 0 ? "text-green-700" : "text-red-700")}>
                      {roi.toFixed(1)}%
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
