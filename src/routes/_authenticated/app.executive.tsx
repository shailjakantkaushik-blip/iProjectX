import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  Legend, CartesianGrid,
} from "recharts";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip, PageSkeleton } from "@/components/streamlit";
import { useAuth } from "@/lib/auth-context";
import { useDomainData, type Project } from "@/lib/portfolio-engine";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/executive")({
  component: ExecutiveDashboard,
});

const RAG_COLORS: Record<string, string> = { Green: "#15803d", Amber: "#f59e0b", Red: "#dc2626" };
const CHART_PALETTE = ["#1d4ed8", "#15803d", "#f59e0b", "#0f766e", "#06b6d4", "#b45309"];
const FUNNEL_STAGES = ["Ideate", "Assess", "Approve", "Deliver", "Close"] as const;
const WATERFALL_COLORS: Record<string, string> = {
  Approved: "#1d4ed8",
  Incurred: "#15803d",
  Forecast: "#f59e0b",
  Variance: "#dc2626",
};

type ChartFilter = {
  rag?: string;
  status?: string;
  deliveryMethod?: string;
  funnelStage?: string;
  roiProjectId?: string;
};

function money(n: number) {
  return "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
}

/** Map status / phase → Spec §5.2 governance funnel stage */
function funnelStage(p: Project): (typeof FUNNEL_STAGES)[number] {
  const status = (p.status || "").toLowerCase();
  const phase = (p.current_phase || "").toLowerCase();
  if (status === "cancelled" || status === "completed" || status === "complete" || phase.includes("handover") || phase.includes("close")) {
    return "Close";
  }
  if (status === "in progress" || phase.includes("build") || phase.includes("test") || phase.includes("deploy") || phase.includes("design")) {
    return "Deliver";
  }
  if (phase.includes("business case") || phase.includes("fund") || phase.includes("approv")) {
    return "Approve";
  }
  if (status === "on hold" || phase.includes("assess") || phase.includes("discovery")) {
    return "Assess";
  }
  if (status === "not started" || phase.includes("idea") || phase.includes("ideate")) {
    return "Ideate";
  }
  return "Deliver";
}

function projectCost(p: Project) {
  const incurred = Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0);
  if (incurred > 0) return incurred;
  return Number(p.budget || 0) || Number(p.capex_approved || 0) + Number(p.opex_approved || 0);
}

function projectBenefit(p: Project) {
  return Number(p.benefits_realised || 0) || Number(p.benefits_target || 0);
}

function projectRoi(p: Project) {
  const cost = projectCost(p);
  if (cost <= 0) return 0;
  return ((projectBenefit(p) - cost) / cost) * 100;
}

function ExecutiveDashboard() {
  const { organization } = useAuth();
  const { projects, isLoading } = useDomainData(organization?.id);
  const [program, setProgram] = useState("All");
  const [sponsor, setSponsor] = useState("All");
  const [priority, setPriority] = useState("All");
  const [status, setStatus] = useState("All");
  const [chartFilter, setChartFilter] = useState<ChartFilter>({});

  const opts = (col: keyof Project) =>
    ["All", ...Array.from(new Set(projects.map((p) => p[col]).filter(Boolean) as string[]))].sort();

  const baseFiltered = useMemo(() => {
    return projects.filter(
      (p) =>
        (program === "All" || p.program === program) &&
        (sponsor === "All" || p.sponsor === sponsor) &&
        (priority === "All" || p.priority === priority) &&
        (status === "All" || p.status === status),
    );
  }, [projects, program, sponsor, priority, status]);

  const filtered = useMemo(() => {
    return baseFiltered.filter((p) => {
      if (chartFilter.rag && p.rag !== chartFilter.rag) return false;
      if (chartFilter.status && p.status !== chartFilter.status) return false;
      if (chartFilter.deliveryMethod && (p.delivery_method || "Unset") !== chartFilter.deliveryMethod) return false;
      if (chartFilter.funnelStage && funnelStage(p) !== chartFilter.funnelStage) return false;
      if (chartFilter.roiProjectId && p.id !== chartFilter.roiProjectId) return false;
      return true;
    });
  }, [baseFiltered, chartFilter]);

  const toggleFilter = (key: keyof ChartFilter, value: string) => {
    setChartFilter((prev) => (prev[key] === value ? { ...prev, [key]: undefined } : { ...prev, [key]: value }));
  };

  const clearChartFilters = () => setChartFilter({});

  const activeChartFilters = Object.entries(chartFilter).filter(([, v]) => v);

  const capexApproved = baseFiltered.reduce((s, p) => s + Number(p.capex_approved || 0), 0);
  const capexIncurred = baseFiltered.reduce((s, p) => s + Number(p.capex_incurred || 0), 0);
  const capexForecast = baseFiltered.reduce((s, p) => {
    const approved = Number(p.capex_approved || 0);
    const incurred = Number(p.capex_incurred || 0);
    return s + Math.max(approved * 1.05, incurred);
  }, 0);
  const remaining = capexApproved - capexIncurred;
  const variance = capexForecast - capexApproved;
  const benefitsRealised = baseFiltered.reduce((s, p) => s + Number(p.benefits_realised || 0), 0);
  const active = baseFiltered.filter((p) => p.status === "In Progress").length;
  const completed = baseFiltered.filter((p) => p.status === "Completed").length;
  const overdue = baseFiltered.filter((p) => {
    if (!p.end_date) return false;
    return new Date(p.end_date) < new Date() && p.status !== "Completed";
  }).length;

  const kpis: [string, string | number][] = [
    ["CAPEX Approved", money(capexApproved)],
    ["Incurred", money(capexIncurred)],
    ["Forecast", money(capexForecast)],
    ["Remaining", money(remaining)],
    ["Active", active],
    ["Completed", completed],
    ["Overdue", overdue],
    ["Benefits", money(benefitsRealised)],
  ];

  const waterfallData = [
    { name: "Approved", value: capexApproved },
    { name: "Incurred", value: capexIncurred },
    { name: "Forecast", value: capexForecast },
    { name: "Variance", value: variance },
  ];

  const ragData = ["Green", "Amber", "Red"]
    .map((r) => ({ name: r, value: baseFiltered.filter((p) => p.rag === r).length }))
    .filter((d) => d.value > 0);

  const statusData = ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"].map((s) => ({
    status: s,
    count: baseFiltered.filter((p) => p.status === s).length,
  }));

  const priorityData = ["Critical", "High", "Medium", "Low"].map((p) => ({
    priority: p,
    count: baseFiltered.filter((x) => x.priority === p).length,
  }));

  const programData = Array.from(
    baseFiltered.reduce((m, p) => {
      const k = p.program || "Unassigned";
      m.set(k, (m.get(k) || 0) + Number(p.budget || 0));
      return m;
    }, new Map<string, number>()),
  ).map(([prog, budget]) => ({ program: prog, budget }));

  const topROI = [...baseFiltered]
    .map((p) => ({
      id: p.id,
      name: (p.name || "").slice(0, 22),
      roi: Math.round(projectRoi(p) * 10) / 10,
    }))
    .filter((x) => x.roi !== 0)
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10)
    .reverse();

  const funnelData = FUNNEL_STAGES.map((stage) => ({
    stage,
    count: baseFiltered.filter((p) => funnelStage(p) === stage).length,
  }));

  const methodMix = Array.from(
    baseFiltered.reduce((m, p) => {
      const k = p.delivery_method || "Unset";
      m.set(k, (m.get(k) || 0) + 1);
      return m;
    }, new Map<string, number>()),
  ).map(([name, value]) => ({ name, value }));

  const spendVsBudget = baseFiltered.slice(0, 10).map((p) => ({
    name: (p.name || "").slice(0, 15),
    budget: Number(p.budget || 0),
    incurred: Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0),
  }));

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading icon="📊" title="Executive Dashboard" subtitle="Spec §5.2 portfolio cockpit with cross-filtering" />

      <SectionFrame>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="mr-auto page-heading text-base">Filters</div>
          {(
            [
              ["Program", program, setProgram, opts("program")],
              ["Sponsor", sponsor, setSponsor, opts("sponsor")],
              ["Priority", priority, setPriority, opts("priority")],
              ["Status", status, setStatus, opts("status")],
            ] as const
          ).map(([label, val, setter, options]) => (
            <select
              key={label}
              value={val}
              onChange={(e) => setter(e.target.value)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
            >
              <option value="All">{label}: All</option>
              {options
                .filter((o) => o !== "All")
                .map((o) => (
                  <option key={o} value={o}>
                    {label}: {o}
                  </option>
                ))}
            </select>
          ))}
        </div>
        {activeChartFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Chart filters:</span>
            {activeChartFilters.map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setChartFilter((prev) => ({ ...prev, [k]: undefined }))}
                className="rounded-md border border-border bg-muted px-2 py-0.5 hover:bg-muted/80"
              >
                {k}: {v} ×
              </button>
            ))}
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearChartFilters}>
              Clear
            </Button>
          </div>
        )}
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Key Metrics</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {kpis.map(([lbl, val]) => (
            <KpiCard key={lbl} label={lbl} value={val} />
          ))}
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Portfolio Analytics</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ChartBox title="CAPEX Waterfall">
            <BarChart data={waterfallData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="name" fontSize={10} />
              <YAxis fontSize={10} tickFormatter={(v) => money(Number(v))} width={56} />
              <Tooltip formatter={(v: number) => money(Number(v))} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {waterfallData.map((e) => (
                  <Cell key={e.name} fill={WATERFALL_COLORS[e.name] || "#1d4ed8"} />
                ))}
              </Bar>
            </BarChart>
          </ChartBox>

          <ChartBox title="RAG Status (click to filter)">
            <PieChart>
              <Pie
                data={ragData}
                dataKey="value"
                nameKey="name"
                outerRadius={70}
                label
                cursor="pointer"
                onClick={(_, idx) => {
                  const row = ragData[idx];
                  if (row) toggleFilter("rag", row.name);
                }}
              >
                {ragData.map((e) => (
                  <Cell
                    key={e.name}
                    fill={RAG_COLORS[e.name]}
                    stroke={chartFilter.rag === e.name ? "#0f172a" : undefined}
                    strokeWidth={chartFilter.rag === e.name ? 2 : 0}
                  />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </PieChart>
          </ChartBox>

          <ChartBox title="Governance Funnel">
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="stage" fontSize={10} />
              <YAxis allowDecimals={false} fontSize={10} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="#0f766e"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data) => {
                  const stage = (data as { stage?: string })?.stage;
                  if (stage) toggleFilter("funnelStage", stage);
                }}
              />
            </BarChart>
          </ChartBox>

          <ChartBox title="Delivery Method Mix">
            {methodMix.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</div>
            ) : (
              <PieChart>
                <Pie
                  data={methodMix}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={70}
                  label
                  cursor="pointer"
                  onClick={(_, idx) => {
                    const row = methodMix[idx];
                    if (row) toggleFilter("deliveryMethod", row.name);
                  }}
                >
                  {methodMix.map((e, i) => (
                    <Cell
                      key={e.name}
                      fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                      stroke={chartFilter.deliveryMethod === e.name ? "#0f172a" : undefined}
                      strokeWidth={chartFilter.deliveryMethod === e.name ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            )}
          </ChartBox>

          <ChartBox title="Top 10 Projects by ROI %">
            {topROI.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No ROI data</div>
            ) : (
              <BarChart data={topROI} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
                <XAxis type="number" fontSize={10} />
                <YAxis type="category" dataKey="name" fontSize={9} width={110} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar
                  dataKey="roi"
                  fill="#15803d"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    const id = (data as { id?: string })?.id;
                    if (id) toggleFilter("roiProjectId", id);
                  }}
                />
              </BarChart>
            )}
          </ChartBox>

          <ChartBox title="Status Distribution">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="status" fontSize={10} />
              <YAxis allowDecimals={false} fontSize={10} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="#1d4ed8"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data) => {
                  const s = (data as { status?: string })?.status;
                  if (s) toggleFilter("status", s);
                }}
              />
            </BarChart>
          </ChartBox>

          <ChartBox title="Priority Mix">
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="priority" fontSize={10} />
              <YAxis allowDecimals={false} fontSize={10} />
              <Tooltip />
              <Bar dataKey="count" fill="#b45309" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartBox>

          <ChartBox title="Budget by Program">
            <BarChart data={programData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="program" fontSize={10} />
              <YAxis fontSize={10} tickFormatter={(v) => money(v)} />
              <Tooltip formatter={(v: number) => money(Number(v))} />
              <Bar dataKey="budget" fill="#15803d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartBox>

          <ChartBox title="Budget vs Incurred (Top 10)">
            <BarChart data={spendVsBudget}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="name" fontSize={9} />
              <YAxis fontSize={10} tickFormatter={(v) => money(v)} />
              <Tooltip formatter={(v: number) => money(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="budget" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="incurred" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartBox>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>
          Projects {activeChartFilters.length > 0 ? `(${filtered.length} matching chart filter)` : `(${filtered.length})`}
        </SectionTitle>
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No projects match filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Program</th>
                  <th>Status</th>
                  <th>Phase</th>
                  <th>Method</th>
                  <th>RAG</th>
                  <th>Funnel</th>
                  <th>ROI %</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Budget</th>
                  <th>Incurred</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 40).map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.program ?? "—"}</td>
                    <td>{p.status ?? "—"}</td>
                    <td>{p.current_phase ?? "—"}</td>
                    <td>{p.delivery_method ?? "—"}</td>
                    <td>
                      <RagChip rag={p.rag} />
                    </td>
                    <td>{funnelStage(p)}</td>
                    <td className="tabular-nums">{Math.round(projectRoi(p))}%</td>
                    <td>{p.start_date ?? "—"}</td>
                    <td>{p.end_date ?? "—"}</td>
                    <td>{money(Number(p.budget || 0))}</td>
                    <td>{money(Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionFrame>
    </div>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-md border border-border bg-surface p-2">
      <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="h-56">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
