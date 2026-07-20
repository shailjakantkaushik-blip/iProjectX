import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid, Cell, ReferenceArea, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { useDomainData, type Project } from "@/lib/domain";
import { fmtMoney } from "@/lib/portfolio-engine";
import { exportPageCsv } from "@/lib/ppt-export";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton,
  RagChip, SectionFrame,
} from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/prioritisation")({
  component: PrioritisationPage,
});

type Weights = {
  strat: number;
  benefit: number;
  risk: number;
  compliance: number;
  complexity: number;
};

const DEFAULT_WEIGHTS: Weights = {
  strat: 0.3,
  benefit: 0.25,
  risk: 0.2,
  compliance: 0.15,
  complexity: 0.1,
};

const QUADRANT_COLORS: Record<string, string> = {
  "Quick Wins": "#15803d",
  "Major Projects": "#1d4ed8",
  "Fill-Ins": "#94a3b8",
  "Money Pits": "#dc2626",
};

function clampScore(v: number) {
  return Math.max(1, Math.min(5, v));
}

/** Heuristic 1–5 component scores from project fields. */
function componentScores(p: Project) {
  const pri = (p.priority || "").toLowerCase();
  let strat = 3;
  if (pri.includes("critical") || pri.includes("p1")) strat = 5;
  else if (pri.includes("high") || pri.includes("p2")) strat = 4;
  else if (pri.includes("low") || pri.includes("p4")) strat = 2;
  if ((p.program || "").toLowerCase().includes("strategic")) strat = Math.min(5, strat + 1);

  const budget = Number(p.budget || p.capex_approved || 0);
  const benefits = Number(p.benefits_target || 0);
  const roi = budget > 0 ? benefits / budget : 0;
  const benefit = clampScore(1 + Math.min(4, roi * 4));

  const rag = (p.rag || "Green").toLowerCase();
  // Risk reduction opportunity: red/amber projects score higher on risk-reduction value
  const riskRed = rag === "red" ? 5 : rag === "amber" ? 4 : 2;

  const blob = `${p.program || ""} ${p.theme || ""} ${p.investment_type || ""} ${p.name || ""}`.toLowerCase();
  const compliance = blob.includes("compliance") || blob.includes("cyber") || blob.includes("security") || blob.includes("regulatory")
    ? 5
    : blob.includes("risk")
      ? 4
      : 2;

  // Effort / complexity proxy from budget size
  let complexity = 2;
  if (budget >= 2_000_000) complexity = 5;
  else if (budget >= 1_000_000) complexity = 4;
  else if (budget >= 400_000) complexity = 3;
  else if (budget >= 100_000) complexity = 2;
  else complexity = 1;

  return { strat, benefit, riskRed, compliance, complexity, budget, benefits, roi };
}

function scoreProject(p: Project, w: Weights) {
  const c = componentScores(p);
  const raw =
    c.strat * w.strat +
    c.benefit * w.benefit +
    c.riskRed * w.risk +
    c.compliance * w.compliance -
    c.complexity * w.complexity;
  const score = Math.round(raw * 20 * 10) / 10;
  // Value (x): ROI / benefit proxy 0–100; Effort (y): budget-normalised 0–100
  const value = Math.min(100, Math.round((c.benefit / 5) * 50 + Math.min(50, c.roi * 40)));
  const effort = Math.min(100, Math.round((c.complexity / 5) * 100));
  let quadrant: keyof typeof QUADRANT_COLORS;
  if (value >= 50 && effort < 50) quadrant = "Quick Wins";
  else if (value >= 50 && effort >= 50) quadrant = "Major Projects";
  else if (value < 50 && effort < 50) quadrant = "Fill-Ins";
  else quadrant = "Money Pits";
  return {
    id: p.id,
    name: p.name,
    program: p.program || "—",
    priority: p.priority || "—",
    rag: p.rag || "Green",
    ...c,
    value,
    effort,
    score,
    quadrant,
  };
}

function PrioritisationPage() {
  const { organization } = useAuth();
  const { projects, isLoading } = useDomainData(organization?.id);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pmo-config-rules");
      if (!raw) return;
      const rules = JSON.parse(raw);
      setWeights({
        strat: Number(rules.PRIORITY_SCORE_WEIGHT_STRAT ?? DEFAULT_WEIGHTS.strat),
        benefit: Number(rules.PRIORITY_SCORE_WEIGHT_BENEFIT ?? DEFAULT_WEIGHTS.benefit),
        risk: Number(rules.PRIORITY_SCORE_WEIGHT_RISK ?? DEFAULT_WEIGHTS.risk),
        compliance: Number(rules.PRIORITY_SCORE_WEIGHT_COMPL ?? DEFAULT_WEIGHTS.compliance),
        complexity: Number(rules.PRIORITY_SCORE_WEIGHT_CPLX ?? DEFAULT_WEIGHTS.complexity),
      });
    } catch {
      /* keep defaults */
    }
  }, []);

  const scored = useMemo(
    () => projects.map((p) => scoreProject(p, weights)).sort((a, b) => b.score - a.score),
    [projects, weights],
  );

  const quadrantCounts = useMemo(() => {
    const m: Record<string, number> = {
      "Quick Wins": 0,
      "Major Projects": 0,
      "Fill-Ins": 0,
      "Money Pits": 0,
    };
    for (const s of scored) m[s.quadrant]++;
    return m;
  }, [scored]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="🏅"
        title="Portfolio Prioritisation"
        subtitle="(Strat×0.30 + Benefit×0.25 + RiskRed×0.20 + Compliance×0.15 − Complexity×0.10) × 20"
      />

      <SectionFrame title="Weighted scoring configurator">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["strat", "Strategic"],
              ["benefit", "Benefit"],
              ["risk", "Risk reduction"],
              ["compliance", "Compliance"],
              ["complexity", "Complexity (−)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              <span className="flex justify-between font-medium text-heading">
                {label}
                <span>{weights[key].toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={weights[key]}
                onChange={(e) =>
                  setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))
                }
                className="accent-[#1d4ed8]"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Sliders re-rank the list live. Defaults load from ConfigRules in localStorage when present.
        </p>
      </SectionFrame>

      <SectionFrame title="Prioritisation KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard label="Projects Scored" value={scored.length} />
          <KpiCard label="Top Score" value={scored[0]?.score ?? "—"} />
          <KpiCard label="Quick Wins" value={quadrantCounts["Quick Wins"]} accent="#15803d" />
          <KpiCard label="Major Projects" value={quadrantCounts["Major Projects"]} accent="#1d4ed8" />
          <KpiCard label="Money Pits" value={quadrantCounts["Money Pits"]} accent="#dc2626" />
        </div>
      </SectionFrame>

      <SectionFrame>
        <ChartCaption
          title="Value × Effort matrix"
          caption="Quick Wins (high value / low effort) · Major Projects · Fill-Ins · Money Pits"
        >
          <div className="h-[400px]">
            {scored.length === 0 ? (
              <EmptyState title="No projects to score" />
            ) : (
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                  {/* Quadrant backgrounds */}
                  <ReferenceArea x1={50} x2={100} y1={0} y2={50} fill="#15803d" fillOpacity={0.06} />
                  <ReferenceArea x1={50} x2={100} y1={50} y2={100} fill="#1d4ed8" fillOpacity={0.06} />
                  <ReferenceArea x1={0} x2={50} y1={0} y2={50} fill="#94a3b8" fillOpacity={0.06} />
                  <ReferenceArea x1={0} x2={50} y1={50} y2={100} fill="#dc2626" fillOpacity={0.06} />
                  <XAxis
                    type="number"
                    dataKey="value"
                    name="Value"
                    domain={[0, 100]}
                    fontSize={11}
                    label={{ value: "Value →", position: "insideBottom", offset: -4, fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="effort"
                    name="Effort"
                    domain={[0, 100]}
                    fontSize={11}
                    label={{ value: "Effort →", angle: -90, position: "insideLeft", fontSize: 11 }}
                  />
                  <ZAxis type="number" dataKey="score" range={[60, 280]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ payload }) => {
                      const row = payload?.[0]?.payload;
                      if (!row) return null;
                      return (
                        <div className="rounded-md border border-border bg-surface px-3 py-2 text-[11px] shadow">
                          <div className="font-semibold text-heading">{row.name}</div>
                          <div>{row.quadrant}</div>
                          <div>Score {row.score} · Value {row.value} · Effort {row.effort}</div>
                          <div>Budget {fmtMoney(row.budget)}</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scored} name="Projects">
                    {scored.map((s) => (
                      <Cell key={s.id} fill={QUADRANT_COLORS[s.quadrant]} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            {Object.entries(QUADRANT_COLORS).map(([name, color]) => (
              <span key={name} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                {name}
              </span>
            ))}
          </div>
        </ChartCaption>
      </SectionFrame>

      <SectionFrame title={`Prioritised list (${scored.length})`}>
        {scored.length === 0 ? (
          <EmptyState title="Nothing ranked" />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Project</th>
                  <th>Program</th>
                  <th>Quadrant</th>
                  <th>RAG</th>
                  <th className="text-right">Strat</th>
                  <th className="text-right">Benefit</th>
                  <th className="text-right">RiskRed</th>
                  <th className="text-right">Compl</th>
                  <th className="text-right">Cplx</th>
                  <th className="text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {scored.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.program}</td>
                    <td style={{ color: QUADRANT_COLORS[p.quadrant], fontWeight: 600 }}>{p.quadrant}</td>
                    <td>
                      <RagChip rag={p.rag} />
                    </td>
                    <td className="text-right tabular-nums">{p.strat}</td>
                    <td className="text-right tabular-nums">{p.benefit}</td>
                    <td className="text-right tabular-nums">{p.riskRed}</td>
                    <td className="text-right tabular-nums">{p.compliance}</td>
                    <td className="text-right tabular-nums">{p.complexity}</td>
                    <td className="text-right tabular-nums font-semibold">{p.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "prioritisation.csv",
              scored.map((p, i) => ({
                rank: i + 1,
                project: p.name,
                program: p.program,
                quadrant: p.quadrant,
                score: p.score,
                strategic: p.strat,
                benefit: p.benefit,
                risk_reduction: p.riskRed,
                compliance: p.compliance,
                complexity: p.complexity,
                value: p.value,
                effort: p.effort,
                budget: p.budget,
              })),
            )
          }
        />
      </SectionFrame>
    </div>
  );
}
