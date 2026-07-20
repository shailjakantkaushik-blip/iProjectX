import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton, SectionFrame,
} from "@/components/streamlit";
import { exportPageCsv } from "@/lib/excel";
import { useDomainData, fmtMoney } from "@/lib/portfolio-engine";

export const Route = createFileRoute("/_authenticated/app/financials")({
  component: FinancialsPage,
});

function FinancialsPage() {
  const { organization } = useAuth();
  const { projects, isLoading } = useDomainData(organization?.id);
  const [selectedId, setSelectedId] = useState<string>("");

  const kpis = useMemo(() => {
    const capexApproved = projects.reduce((s, p) => s + Number(p.capex_approved || 0), 0);
    const capexIncurred = projects.reduce((s, p) => s + Number(p.capex_incurred || 0), 0);
    const opexApproved = projects.reduce((s, p) => s + Number(p.opex_approved || 0), 0);
    const opexIncurred = projects.reduce((s, p) => s + Number(p.opex_incurred || 0), 0);
    const forecast = projects.reduce((s, p) => {
      const a = Number(p.forecast_at_completion || p.budget || 0) ||
        Number(p.capex_approved || 0) + Number(p.opex_approved || 0);
      const spent = Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0);
      return s + Math.max(a, spent);
    }, 0);
    const pv = capexApproved + opexApproved;
    const ev = projects.reduce((s, p) => {
      const budget = Number(p.budget || 0) || Number(p.capex_approved || 0) + Number(p.opex_approved || 0);
      const progress = Number(p.progress_pct || 0) / 100 ||
        (p.status === "Completed" || p.status === "Complete" ? 1 : p.rag === "Green" ? 0.55 : p.rag === "Amber" ? 0.4 : 0.25);
      return s + budget * progress;
    }, 0);
    const ac = capexIncurred + opexIncurred;
    const spi = pv > 0 ? ev / pv : 0;
    const cpi = ac > 0 ? ev / ac : 0;
    const eac = cpi > 0 ? pv / cpi : forecast;
    return {
      capexApproved,
      capexIncurred,
      capexForecast: forecast * (capexApproved / Math.max(1, pv)),
      opexApproved,
      opexIncurred,
      variance: pv - forecast,
      spi,
      cpi,
      eac,
      pv,
      ev,
      ac,
    };
  }, [projects]);

  const byBu = useMemo(() => {
    const m = new Map<string, { name: string; capex: number; opex: number }>();
    for (const p of projects) {
      const name = p.program || "Unassigned";
      const cur = m.get(name) || { name, capex: 0, opex: 0 };
      cur.capex += Number(p.capex_approved || 0);
      cur.opex += Number(p.opex_approved || 0);
      m.set(name, cur);
    }
    return [...m.values()];
  }, [projects]);

  const selected = projects.find((p) => p.id === selectedId) || projects[0];

  const evmCurve = useMemo(() => {
    if (!selected) return [];
    const budget = Number(selected.budget || 0) ||
      Number(selected.capex_approved || 0) + Number(selected.opex_approved || 0);
    const actual = Number(selected.capex_incurred || 0) + Number(selected.opex_incurred || 0);
    const months = ["M1", "M2", "M3", "M4", "M5", "M6"];
    return months.map((m, i) => {
      const t = (i + 1) / months.length;
      return {
        month: m,
        PV: Math.round(budget * t),
        EV: Math.round(budget * t * (selected.rag === "Red" ? 0.75 : selected.rag === "Amber" ? 0.9 : 1.0)),
        AC: Math.round(actual * Math.min(1, t * 1.1)),
      };
    });
  }, [selected]);

  const roiTable = useMemo(() => {
    return [...projects]
      .map((p) => {
        const cost = Number(p.budget || 0) || Number(p.capex_approved || 0) + Number(p.opex_approved || 0) || 1;
        const benefits = Number(p.benefits_target || 0);
        const roi = ((benefits - cost) / cost) * 100;
        return { id: p.id, name: p.name, cost, benefits, roi, npv: benefits - cost };
      })
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 20);
  }, [projects]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="💰"
        title="Financials"
        subtitle="CAPEX / OPEX + EVM (SPI, CPI, EAC)"
        actions={
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={selected?.id || ""}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        }
      />

      <SectionFrame title="Money KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
          <KpiCard label="CAPEX Approved" value={fmtMoney(kpis.capexApproved)} />
          <KpiCard label="CAPEX Incurred" value={fmtMoney(kpis.capexIncurred)} />
          <KpiCard label="CAPEX Forecast" value={fmtMoney(kpis.capexForecast)} />
          <KpiCard label="OPEX Approved" value={fmtMoney(kpis.opexApproved)} />
          <KpiCard label="OPEX Incurred" value={fmtMoney(kpis.opexIncurred)} />
          <KpiCard label="Total Variance" value={fmtMoney(kpis.variance)} accent={kpis.variance < 0 ? "#dc2626" : "#16a34a"} />
          <KpiCard label="SPI" value={kpis.spi.toFixed(2)} accent={kpis.spi < 0.9 ? "#dc2626" : "#16a34a"} />
          <KpiCard label="CPI" value={kpis.cpi.toFixed(2)} accent={kpis.cpi < 0.9 ? "#dc2626" : "#16a34a"} />
          <KpiCard label="EAC" value={fmtMoney(kpis.eac)} />
        </div>
      </SectionFrame>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionFrame>
          <ChartCaption title="CAPEX vs OPEX by Program" caption="Stacked approved funding by portfolio program">
            <div className="h-[320px]">
              {byBu.length === 0 ? (
                <EmptyState title="No financials" />
              ) : (
                <ResponsiveContainer>
                  <BarChart data={byBu}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={10} tickFormatter={(v) => fmtMoney(Number(v))} />
                    <Tooltip formatter={(v: number) => fmtMoney(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="capex" stackId="a" fill="#1d4ed8" radius={4} name="CAPEX" />
                    <Bar dataKey="opex" stackId="a" fill="#15803d" radius={4} name="OPEX" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCaption>
        </SectionFrame>

        <SectionFrame>
          <ChartCaption
            title={`EVM curves — ${selected?.name || "Project"}`}
            caption="Planned Value (PV) · Earned Value (EV) · Actual Cost (AC)"
          >
            <div className="h-[320px]">
              <ResponsiveContainer>
                <LineChart data={evmCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={10} tickFormatter={(v) => fmtMoney(Number(v))} />
                  <Tooltip formatter={(v: number) => fmtMoney(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="PV" stroke="#1d4ed8" strokeWidth={2} />
                  <Line type="monotone" dataKey="EV" stroke="#15803d" strokeWidth={2} />
                  <Line type="monotone" dataKey="AC" stroke="#dc2626" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCaption>
        </SectionFrame>
      </div>

      <SectionFrame title="ROI leaderboard (top 20)">
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>Project</th>
                <th className="text-right">Cost</th>
                <th className="text-right">Benefits</th>
                <th className="text-right">ROI %</th>
                <th className="text-right">NPV proxy</th>
              </tr>
            </thead>
            <tbody>
              {roiTable.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td className="text-right tabular-nums">{fmtMoney(r.cost)}</td>
                  <td className="text-right tabular-nums">{fmtMoney(r.benefits)}</td>
                  <td className="text-right tabular-nums" style={{ color: r.roi >= 0 ? "#16a34a" : "#dc2626" }}>
                    {r.roi.toFixed(1)}%
                  </td>
                  <td className="text-right tabular-nums">{fmtMoney(r.npv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "financials-roi.csv",
              roiTable.map((r) => ({
                project: r.name,
                cost: r.cost,
                benefits: r.benefits,
                roi_pct: r.roi,
                npv: r.npv,
              })),
            )
          }
        />
      </SectionFrame>
    </div>
  );
}
