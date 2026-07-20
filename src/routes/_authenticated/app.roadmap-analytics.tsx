import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { useDomainData, type Project } from "@/lib/domain";
import { fmtMoney } from "@/lib/portfolio-engine";
import { exportPageCsv } from "@/lib/ppt-export";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton, SectionFrame,
} from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/roadmap-analytics")({
  component: RoadmapAnalyticsPage,
});

const MIX_COLORS: Record<string, string> = {
  Strategic: "#1d4ed8",
  "Run-the-Business": "#15803d",
  Compliance: "#f59e0b",
};

/** Derive Strategic / Run-the-Business / Compliance from program + priority (+ investment_type when present). */
function investmentBucket(p: Project): "Strategic" | "Run-the-Business" | "Compliance" {
  const inv = (p.investment_type || "").toLowerCase();
  const prog = (p.program || "").toLowerCase();
  const pri = (p.priority || "").toLowerCase();
  const theme = (p.theme || "").toLowerCase();
  const blob = `${inv} ${prog} ${theme}`;
  if (
    blob.includes("compliance") ||
    blob.includes("cyber") ||
    blob.includes("security") ||
    blob.includes("regulatory") ||
    blob.includes("risk platform")
  ) {
    return "Compliance";
  }
  if (
    inv.includes("transform") ||
    inv.includes("grow") ||
    prog.includes("strategic") ||
    pri.includes("critical") ||
    pri.includes("p1") ||
    pri === "high"
  ) {
    return "Strategic";
  }
  if (inv.includes("run")) return "Run-the-Business";
  return "Run-the-Business";
}

function flowBucket(p: Project): "Ideation" | "Delivery" | "Closure" {
  const s = (p.status || "").toLowerCase();
  const ph = (p.current_phase || "").toLowerCase();
  if (
    s.includes("complete") ||
    s.includes("closed") ||
    ph.includes("handover") ||
    ph.includes("closure") ||
    ph.includes("close") ||
    ph.includes("benefits")
  ) {
    return "Closure";
  }
  if (
    s.includes("not started") ||
    s.includes("pipeline") ||
    s.includes("proposed") ||
    ph.includes("ideation") ||
    ph.includes("discovery") ||
    ph.includes("idea") ||
    ph.includes("business case")
  ) {
    return "Ideation";
  }
  return "Delivery";
}

function seededNormal(seed: number): number {
  // Box-Muller with deterministic seed sequence
  const u1 = ((seed * 9301 + 49297) % 233280) / 233280;
  const u2 = (((seed + 1) * 9301 + 49297) % 233280) / 233280;
  const r = Math.sqrt(-2 * Math.log(Math.max(1e-12, u1)));
  return r * Math.cos(2 * Math.PI * u2);
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function RoadmapAnalyticsPage() {
  const { organization } = useAuth();
  const { projects, isLoading } = useDomainData(organization?.id);
  const [iterations, setIterations] = useState(2000);

  const mix = useMemo(() => {
    const buckets: Record<string, number> = {
      Strategic: 0,
      "Run-the-Business": 0,
      Compliance: 0,
    };
    for (const p of projects) {
      const b = investmentBucket(p);
      buckets[b] += Number(p.budget || p.capex_approved || 0);
    }
    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [projects]);

  const flow = useMemo(() => {
    const counts = { Ideation: 0, Delivery: 0, Closure: 0 };
    for (const p of projects) counts[flowBucket(p)]++;
    return [
      { stage: "Ideation", count: counts.Ideation, fill: "#94a3b8" },
      { stage: "Delivery", count: counts.Delivery, fill: "#1d4ed8" },
      { stage: "Closure", count: counts.Closure, fill: "#15803d" },
    ];
  }, [projects]);

  const durationBuckets = useMemo(() => {
    const buckets = [
      { name: "< 3m", min: 0, max: 3, count: 0 },
      { name: "3–6m", min: 3, max: 6, count: 0 },
      { name: "6–12m", min: 6, max: 12, count: 0 },
      { name: "12m+", min: 12, max: Infinity, count: 0 },
    ];
    for (const p of projects) {
      if (!p.start_date || !p.end_date) continue;
      const months =
        (new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) /
        (1000 * 60 * 60 * 24 * 30.44);
      const b = buckets.find((x) => months >= x.min && months < x.max);
      if (b) b.count++;
    }
    return buckets;
  }, [projects]);

  const mc = useMemo(() => {
    const forecast = projects.reduce((s, p) => {
      const f = Number(p.forecast_at_completion || p.budget || p.capex_approved || 0);
      return s + f;
    }, 0);
    const approved = projects.reduce(
      (s, p) => s + Number(p.approved_funding || p.budget || p.capex_approved || 0),
      0,
    );
    const sigma = Math.max(forecast * 0.15, 1);
    const samples: number[] = [];
    for (let i = 0; i < iterations; i++) {
      samples.push(Math.max(0, forecast + seededNormal(i * 17 + 3) * sigma));
    }
    const sorted = [...samples].sort((a, b) => a - b);
    const p50 = percentile(sorted, 50);
    const p80 = percentile(sorted, 80);
    const p90 = percentile(sorted, 90);

    // Histogram bins
    const min = sorted[0] ?? 0;
    const max = sorted[sorted.length - 1] ?? 1;
    const nBins = 40;
    const width = (max - min) / nBins || 1;
    const bins = Array.from({ length: nBins }, (_, i) => ({
      mid: (min + (i + 0.5) * width) / 1e6,
      count: 0,
      label: `$${((min + i * width) / 1e6).toFixed(1)}M`,
    }));
    for (const s of samples) {
      let idx = Math.floor((s - min) / width);
      if (idx >= nBins) idx = nBins - 1;
      if (idx < 0) idx = 0;
      bins[idx].count++;
    }
    return { forecast, approved, p50, p80, p90, bins, samples };
  }, [projects, iterations]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="🧠"
        title="Strategic Roadmap Analytics"
        subtitle="Investment mix · Monte-Carlo EAC · duration profile · portfolio flow"
      />

      <SectionFrame title="Monte-Carlo iterations">
        <label className="flex flex-col gap-2 text-sm text-muted-foreground">
          Iterations: <span className="font-semibold text-heading">{iterations}</span>
          <input
            type="range"
            min={500}
            max={5000}
            step={500}
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            className="w-full max-w-md accent-[#1d4ed8]"
          />
          <span className="text-[11px]">500 – 5,000 (step 500)</span>
        </label>
      </SectionFrame>

      <SectionFrame title="Analytics KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Approved Budget" value={fmtMoney(mc.approved)} />
          <KpiCard label="P50 EAC" value={fmtMoney(mc.p50)} />
          <KpiCard label="P80 EAC" value={fmtMoney(mc.p80)} accent="#f59e0b" />
          <KpiCard label="P90 EAC" value={fmtMoney(mc.p90)} accent="#dc2626" />
        </div>
      </SectionFrame>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionFrame>
          <ChartCaption title="Investment mix" caption="Strategic · Run-the-Business · Compliance (budget $)">
            <div className="h-[300px]">
              {mix.length === 0 ? (
                <EmptyState title="No investment data" />
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={mix} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2} label>
                      {mix.map((d) => (
                        <Cell key={d.name} fill={MIX_COLORS[d.name] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtMoney(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCaption>
        </SectionFrame>

        <SectionFrame>
          <ChartCaption title="Portfolio flow" caption="Ideation → Delivery → Closure (from status / phase)">
            <div className="h-[300px]">
              <ResponsiveContainer>
                <BarChart data={flow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                  <XAxis dataKey="stage" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {flow.map((d) => (
                      <Cell key={d.stage} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCaption>
        </SectionFrame>
      </div>

      <SectionFrame>
        <ChartCaption
          title="Monte-Carlo cost simulation"
          caption={`~${iterations} EAC samples around forecast Σ = ${fmtMoney(mc.forecast)} (σ ≈ 15%). Vertical lines: P50 / P80 / P90.`}
        >
          <div className="h-[360px]">
            {projects.length === 0 ? (
              <EmptyState title="No projects to simulate" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={mc.bins} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                  <XAxis
                    type="number"
                    dataKey="mid"
                    domain={["dataMin", "dataMax"]}
                    fontSize={10}
                    tickFormatter={(v) => `${Number(v).toFixed(1)}`}
                    label={{ value: "EAC ($M)", position: "insideBottom", offset: -2, fontSize: 11 }}
                  />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) => `≈ $${Number(v).toFixed(2)}M`}
                    formatter={(v) => [v, "Samples"]}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <ReferenceLine
                    x={mc.p50 / 1e6}
                    stroke="#15803d"
                    strokeDasharray="4 2"
                    label={{ value: "P50", fill: "#15803d", fontSize: 11 }}
                  />
                  <ReferenceLine
                    x={mc.p80 / 1e6}
                    stroke="#f59e0b"
                    strokeDasharray="4 2"
                    label={{ value: "P80", fill: "#f59e0b", fontSize: 11 }}
                  />
                  <ReferenceLine
                    x={mc.p90 / 1e6}
                    stroke="#dc2626"
                    strokeDasharray="4 2"
                    label={{ value: "P90", fill: "#dc2626", fontSize: 11 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCaption>
      </SectionFrame>

      <SectionFrame>
        <ChartCaption title="Duration profile" caption="Project length buckets from start → end dates">
          <div className="h-[280px]">
            <ResponsiveContainer>
              <BarChart data={durationBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCaption>
        <ExportBar
          onCsv={() =>
            exportPageCsv("roadmap-analytics.csv", [
              { metric: "approved", value: mc.approved },
              { metric: "forecast", value: mc.forecast },
              { metric: "p50", value: mc.p50 },
              { metric: "p80", value: mc.p80 },
              { metric: "p90", value: mc.p90 },
              { metric: "iterations", value: iterations },
              ...flow.map((f) => ({ metric: `flow_${f.stage}`, value: f.count })),
              ...mix.map((m) => ({ metric: `mix_${m.name}`, value: m.value })),
            ])
          }
        />
      </SectionFrame>
    </div>
  );
}
