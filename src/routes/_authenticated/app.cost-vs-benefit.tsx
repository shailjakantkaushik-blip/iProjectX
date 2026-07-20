import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { exportPageCsv } from "@/lib/excel";
import { useDomainData, fmtMoney, portfolioCategory, type Project } from "@/lib/portfolio-engine";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton, SectionFrame,
} from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/cost-vs-benefit")({
  component: CostVsBenefitPage,
});

type YearRow = {
  year: number;
  label: string;
  capex: number;
  opex: number;
  recurring: number;
  oneOff: number;
  cost: number;
  benefit: number;
  net: number;
  cumulative: number;
};

function projectStartYear(p: Project): number {
  if (p.start_date) {
    const y = new Date(p.start_date).getFullYear();
    if (Number.isFinite(y)) return y;
  }
  return new Date().getFullYear();
}

function deriveYears(projects: Project[]): YearRow[] {
  if (!projects.length) return [];
  const baseYear = Math.min(...projects.map(projectStartYear));
  const years = Array.from({ length: 5 }, (_, i) => baseYear + i);

  const byYear = years.map((year) => ({
    year,
    label: String(year),
    capex: 0,
    opex: 0,
    recurring: 0,
    oneOff: 0,
  }));

  for (const p of projects) {
    const startY = projectStartYear(p);
    const capex = Number(p.capex_approved || 0);
    const opex = Number(p.opex_approved || 0);
    // If budget exists but no split, treat as CAPEX-heavy
    const budget = Number(p.budget || 0);
    const totalCapex = capex || (budget > 0 && !opex ? budget * 0.7 : capex);
    const totalOpex = opex || (budget > 0 && !capex ? budget * 0.3 : opex);
    const benefits = Number(p.benefits_target || 0);
    // Recurring ~70% of benefits from year 1 onward; one-off 30% in go-live year
    const recurringAnnual = (benefits * 0.7) / 5;
    const oneOff = benefits * 0.3;
    const goLiveY = p.target_go_live
      ? new Date(p.target_go_live).getFullYear()
      : p.end_date
        ? new Date(p.end_date).getFullYear()
        : startY + 2;

    for (let i = 0; i < 5; i++) {
      const y = startY + i;
      const row = byYear.find((r) => r.year === y);
      if (!row) continue;
      // Spread CAPEX over first 3 years, OPEX over all 5
      row.capex += i < 3 ? totalCapex / 3 : 0;
      row.opex += totalOpex / 5;
      row.recurring += recurringAnnual;
      if (y === goLiveY || (i === 2 && !Number.isFinite(goLiveY))) {
        row.oneOff += oneOff;
      }
    }
  }

  let cumulative = 0;
  return byYear.map((r) => {
    const cost = r.capex + r.opex;
    const benefit = r.recurring + r.oneOff;
    const net = benefit - cost;
    cumulative += net;
    return { ...r, cost, benefit, net, cumulative };
  });
}

function CostVsBenefitPage() {
  const { organization } = useAuth();
  const { projects, isLoading } = useDomainData(organization?.id);
  const [program, setProgram] = useState("All");
  const [category, setCategory] = useState("All");

  const programs = useMemo(
    () => [...new Set(projects.map((p) => p.program).filter(Boolean) as string[])].sort(),
    [projects],
  );
  const categories = useMemo(
    () =>
      [...new Set(projects.map((p) => p.portfolio_category || portfolioCategory(p)))].sort(),
    [projects],
  );

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (program !== "All" && (p.program || "") !== program) return false;
      const cat = p.portfolio_category || portfolioCategory(p);
      if (category !== "All" && cat !== category) return false;
      return true;
    });
  }, [projects, program, category]);

  const yearly = useMemo(() => deriveYears(filtered), [filtered]);

  const projectRoi = useMemo(() => {
    return filtered
      .map((p) => {
        const cost =
          Number(p.budget || 0) ||
          Number(p.capex_approved || 0) + Number(p.opex_approved || 0) ||
          1;
        const benefit = Number(p.benefits_target || 0);
        const net = benefit - cost;
        const roi = (net / cost) * 100;
        return {
          id: p.id,
          name: p.name,
          program: p.program || "—",
          category: p.portfolio_category || portfolioCategory(p),
          cost,
          benefit,
          net,
          roi,
        };
      })
      .sort((a, b) => b.roi - a.roi);
  }, [filtered]);

  const kpis = useMemo(() => {
    const totalCost = yearly.reduce((s, y) => s + y.cost, 0);
    const totalBenefit = yearly.reduce((s, y) => s + y.benefit, 0);
    const net = totalBenefit - totalCost;
    const roi = totalCost > 0 ? (net / totalCost) * 100 : 0;
    let payback: number | null = null;
    for (let i = 0; i < yearly.length; i++) {
      if (yearly[i].cumulative >= 0) {
        // Interpolate within year if prior cumulative was negative
        if (i === 0) payback = yearly[i].net >= 0 ? 0 : null;
        else {
          const prev = yearly[i - 1].cumulative;
          const cur = yearly[i].cumulative;
          const frac = cur === prev ? 0 : Math.max(0, Math.min(1, -prev / (cur - prev)));
          payback = i - 1 + frac + 1; // years from start (1-indexed span)
          // Better: years from year 0
          payback = i + frac;
        }
        break;
      }
    }
    return { totalCost, totalBenefit, net, roi, payback };
  }, [yearly]);

  const breakEven = useMemo(() => {
    for (let i = 0; i < yearly.length; i++) {
      if (yearly[i].cumulative >= 0) {
        return { year: yearly[i].label, value: yearly[i].cumulative };
      }
    }
    return null;
  }, [yearly]);

  // Chart data: costs as negative for stacked relative view like Streamlit
  const stackedChart = useMemo(
    () =>
      yearly.map((y) => ({
        year: y.label,
        CAPEX: -y.capex,
        OPEX: -y.opex,
        "Benefit Recurring": y.recurring,
        "Benefit One-Off": y.oneOff,
      })),
    [yearly],
  );

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="💹"
        title="Cost vs Benefit"
        subtitle="5-year CAPEX/OPEX vs recurring & one-off benefits · portfolio ROI"
      />

      <SectionFrame title="Filters">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Program
            <select
              className="h-9 min-w-[160px] rounded-md border border-border bg-surface px-2 text-sm text-heading"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
            >
              <option>All</option>
              {programs.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Portfolio Category
            <select
              className="h-9 min-w-[160px] rounded-md border border-border bg-surface px-2 text-sm text-heading"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>All</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
      </SectionFrame>

      <SectionFrame title="ROI Summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard label="Total 5-yr Cost" value={fmtMoney(kpis.totalCost)} />
          <KpiCard label="Total 5-yr Benefit" value={fmtMoney(kpis.totalBenefit)} accent="#16a34a" />
          <KpiCard
            label="Net Value"
            value={fmtMoney(kpis.net)}
            accent={kpis.net >= 0 ? "#16a34a" : "#dc2626"}
          />
          <KpiCard label="Portfolio ROI %" value={`${kpis.roi.toFixed(1)}%`} />
          <KpiCard
            label="Payback (yrs)"
            value={kpis.payback == null ? "—" : kpis.payback.toFixed(1)}
            animate={false}
          />
        </div>
      </SectionFrame>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionFrame>
          <ChartCaption
            title="5-year Cost vs Benefit"
            caption="Stacked CAPEX+OPEX (below) vs Recurring+One-off benefits (above)"
          >
            <div className="h-[340px]">
              {stackedChart.length === 0 ? (
                <EmptyState title="No cost/benefit data" />
              ) : (
                <ResponsiveContainer>
                  <BarChart data={stackedChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                    <XAxis dataKey="year" fontSize={11} />
                    <YAxis fontSize={10} tickFormatter={(v) => fmtMoney(Number(v))} />
                    <Tooltip formatter={(v: number) => fmtMoney(Math.abs(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="CAPEX" stackId="cost" fill="#ef4444" />
                    <Bar dataKey="OPEX" stackId="cost" fill="#f59e0b" />
                    <Bar dataKey="Benefit Recurring" stackId="ben" fill="#22c55e" />
                    <Bar dataKey="Benefit One-Off" stackId="ben" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCaption>
        </SectionFrame>

        <SectionFrame>
          <ChartCaption
            title="Cumulative cashflow"
            caption="Break-even annotated when cumulative net crosses zero"
          >
            <div className="h-[340px]">
              {yearly.length === 0 ? (
                <EmptyState title="No cashflow data" />
              ) : (
                <ResponsiveContainer>
                  <LineChart data={yearly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={10} tickFormatter={(v) => fmtMoney(Number(v))} />
                    <Tooltip formatter={(v: number) => fmtMoney(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      name="Cumulative net"
                      stroke="#1d4ed8"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    {breakEven && (
                      <ReferenceDot
                        x={breakEven.year}
                        y={breakEven.value}
                        r={6}
                        fill="#16a34a"
                        stroke="#fff"
                        strokeWidth={2}
                        label={{ value: "Break-even", position: "top", fill: "#15803d", fontSize: 11 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCaption>
        </SectionFrame>
      </div>

      <SectionFrame title="Per-project ROI">
        {projectRoi.length === 0 ? (
          <EmptyState title="No projects" />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Program</th>
                  <th>Category</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Benefit</th>
                  <th className="text-right">Net</th>
                  <th className="text-right">ROI %</th>
                </tr>
              </thead>
              <tbody>
                {projectRoi.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.name}</td>
                    <td>{r.program}</td>
                    <td>{r.category}</td>
                    <td className="text-right tabular-nums">{fmtMoney(r.cost)}</td>
                    <td className="text-right tabular-nums">{fmtMoney(r.benefit)}</td>
                    <td className="text-right tabular-nums">{fmtMoney(r.net)}</td>
                    <td
                      className="text-right tabular-nums"
                      style={{ color: r.roi >= 0 ? "#16a34a" : "#dc2626" }}
                    >
                      {r.roi.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "cost-vs-benefit.csv",
              projectRoi.map((r) => ({
                project: r.name,
                program: r.program,
                category: r.category,
                cost: r.cost,
                benefit: r.benefit,
                net: r.net,
                roi_pct: r.roi,
              })),
            )
          }
        />
      </SectionFrame>
    </div>
  );
}
