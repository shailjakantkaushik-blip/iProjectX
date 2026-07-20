import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton,
  SectionFrame, StatusChip,
} from "@/components/streamlit";
import { exportPageCsv } from "@/lib/excel";
import { useDomainData, fmtMoney } from "@/lib/portfolio-engine";

export const Route = createFileRoute("/_authenticated/app/benefits")({
  component: BenefitsPage,
});

const STATUS_COLORS = ["#1d4ed8", "#16a34a", "#f59e0b", "#dc2626", "#64748b", "#7c3aed"];

function BenefitsPage() {
  const { organization } = useAuth();
  const { benefits, isLoading } = useDomainData(organization?.id);

  const target = benefits.reduce((s, b) => s + Number(b.target_value || 0), 0);
  const realised = benefits.reduce((s, b) => s + Number(b.realised_value || 0), 0);
  const remaining = target - realised;
  const realisationPct = target > 0 ? Math.round((realised / target) * 1000) / 10 : 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, { category: string; Target: number; Realised: number }>();
    for (const b of benefits) {
      const cat = b.category || "Uncategorised";
      const row = map.get(cat) || { category: cat, Target: 0, Realised: 0 };
      row.Target += Number(b.target_value || 0);
      row.Realised += Number(b.realised_value || 0);
      map.set(cat, row);
    }
    return [...map.values()].sort((a, b) => b.Target - a.Target);
  }, [benefits]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of benefits) {
      map.set(b.status, (map.get(b.status) || 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [benefits]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="💎"
        title="Benefits Realisation"
        subtitle="Track target vs realised benefits across the portfolio"
      />

      <SectionFrame title="Benefits KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Target" value={fmtMoney(target)} />
          <KpiCard label="Realised" value={fmtMoney(realised)} accent="#16a34a" />
          <KpiCard label="Remaining" value={fmtMoney(remaining)} accent="#f59e0b" />
          <KpiCard label="Realisation %" value={`${realisationPct}%`} accent="#1d4ed8" />
        </div>
      </SectionFrame>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionFrame>
          <ChartCaption title="Target vs Realised by Category" caption="Grouped bars of benefit value">
            {byCategory.length === 0 ? (
              <EmptyState title="No benefits" description="Benefits appear once projects have target values or the benefits table is seeded." />
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer>
                  <BarChart data={byCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                    <XAxis dataKey="category" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => fmtMoney(Number(v))} />
                    <Tooltip formatter={(v: number) => fmtMoney(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Realised" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCaption>
        </SectionFrame>

        <SectionFrame>
          <ChartCaption title="Benefit status" caption="Donut of register status mix">
            {byStatus.length === 0 ? (
              <EmptyState title="No status data" />
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={byStatus}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {byStatus.map((d, i) => (
                        <Cell key={d.name} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCaption>
        </SectionFrame>
      </div>

      <SectionFrame title={`Benefits register (${benefits.length})`}>
        {benefits.length === 0 ? (
          <EmptyState title="No benefits" description="Benefits appear once projects have target values or the benefits table is seeded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Benefit</th>
                  <th>Project</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th className="text-right">Target</th>
                  <th className="text-right">Realised</th>
                  <th className="text-right">Remaining</th>
                  <th className="text-right">%</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Target Date</th>
                </tr>
              </thead>
              <tbody>
                {benefits
                  .slice()
                  .sort((a, b) => Number(b.target_value || 0) - Number(a.target_value || 0))
                  .map((b) => {
                    const t = Number(b.target_value || 0);
                    const r = Number(b.realised_value || 0);
                    const pct = t > 0 ? (r / t) * 100 : 0;
                    return (
                      <tr key={b.id}>
                        <td className="font-medium">{b.name}</td>
                        <td>{b.project_name || "—"}</td>
                        <td>{b.category || "—"}</td>
                        <td>{b.type}</td>
                        <td className="text-right tabular-nums">{fmtMoney(t)}</td>
                        <td className="text-right tabular-nums">{fmtMoney(r)}</td>
                        <td className="text-right tabular-nums">{fmtMoney(t - r)}</td>
                        <td className="text-right tabular-nums">{pct.toFixed(1)}%</td>
                        <td><StatusChip status={b.status} /></td>
                        <td>{b.owner || "—"}</td>
                        <td>{b.target_date || "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "benefits.csv",
              benefits.map((b) => ({
                name: b.name,
                project: b.project_name,
                category: b.category,
                type: b.type,
                target: b.target_value,
                realised: b.realised_value,
                status: b.status,
                owner: b.owner,
                target_date: b.target_date,
              })),
            )
          }
        />
      </SectionFrame>
    </div>
  );
}
