import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard } from "@/components/streamlit";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/app/fy-allocation")({
  component: FYAllocationPage,
});

const fmtM = (n: number) => `$${(n / 1e6).toFixed(2)}M`;

/** Derive fiscal year label (Jul–Jun basis) from a date. */
function fyOf(d: Date): string {
  const y = d.getFullYear();
  const start = d.getMonth() >= 6 ? y : y - 1;
  return `FY${String(start + 1).slice(-2)}`;
}

function FYAllocationPage() {
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

  // Split each project's budget evenly across FYs it spans.
  const alloc = new Map<string, { fy: string; capex: number; opex: number; total: number; count: number }>();
  for (const p of projects) {
    if (!p.start_date || !p.end_date) continue;
    const s = new Date(p.start_date), e = new Date(p.end_date);
    if (e < s) continue;
    const fys = new Set<string>();
    const cur = new Date(s);
    while (cur <= e) {
      fys.add(fyOf(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
    const n = fys.size || 1;
    const capex = Number(p.capex_approved || 0) / n;
    const opex = Number(p.opex_approved || 0) / n;
    const total = (Number(p.budget || 0)) / n;
    for (const fy of fys) {
      const row = alloc.get(fy) ?? { fy, capex: 0, opex: 0, total: 0, count: 0 };
      row.capex += capex; row.opex += opex; row.total += total; row.count += 1;
      alloc.set(fy, row);
    }
  }
  const rows = [...alloc.values()].sort((a, b) => a.fy.localeCompare(b.fy));

  const totalFY = rows.reduce((s, r) => s + r.total, 0);
  const peakFY = rows.reduce((m, r) => (r.total > (m?.total || 0) ? r : m), rows[0]);

  return (
    <div>
      <PageHeading icon="📅">FY Allocation</PageHeading>
      <div className="text-sm text-muted-foreground mb-4">
        Budget spread evenly across each project's active fiscal years (Jul–Jun).
      </div>

      <SectionFrame>
        <SectionTitle>FY KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Fiscal Years" value={rows.length} />
          <KpiCard label="Total Allocated" value={fmtM(totalFY)} />
          <KpiCard label="Peak FY" value={peakFY?.fy || "—"} sub={peakFY ? fmtM(peakFY.total) : ""} />
          <KpiCard label="Projects Covered" value={projects.filter((p) => p.start_date && p.end_date).length} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>CAPEX vs OPEX by FY</SectionTitle>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="fy" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => fmtM(v)} />
              <Legend />
              <Bar dataKey="capex" name="CAPEX" stackId="a" fill="#1d4ed8" />
              <Bar dataKey="opex" name="OPEX" stackId="a" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>FY Allocation Register</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>FY</th><th>Projects</th><th>CAPEX</th><th>OPEX</th><th>Total Budget</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.fy}>
                  <td className="font-medium">{r.fy}</td>
                  <td>{r.count}</td>
                  <td>{fmtM(r.capex)}</td>
                  <td>{fmtM(r.opex)}</td>
                  <td>{fmtM(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
