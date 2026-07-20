import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton,
  SectionFrame, StatusChip,
} from "@/components/streamlit";
import { exportPageCsv } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { scorePipeline, useDomainData, fmtMoney, type PipelineIdea } from "@/lib/portfolio-engine";

export const Route = createFileRoute("/_authenticated/app/demand-pipeline")({
  component: DemandPipelinePage,
});

const FIT_COLORS = ["#94a3b8", "#60a5fa", "#3b82f6", "#1d4ed8", "#0f172a"];

function fitColor(fit: number) {
  const i = Math.min(5, Math.max(1, Math.round(fit))) - 1;
  return FIT_COLORS[i];
}

function DemandPipelinePage() {
  const { organization } = useAuth();
  const { pipeline, isLoading } = useDomainData(organization?.id);
  const [localIdeas, setLocalIdeas] = useState<PipelineIdea[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [submitterFilter, setSubmitterFilter] = useState("All");
  const [name, setName] = useState("");
  const [submitter, setSubmitter] = useState("");
  const [budget, setBudget] = useState(150000);
  const [s, setS] = useState(3);
  const [v, setV] = useState(3);
  const [r, setR] = useState(2);
  const [e, setE] = useState(3);
  const [saving, setSaving] = useState(false);

  const liveScore = scorePipeline(s, v, r, e);

  const allIdeas = useMemo(() => {
    const ids = new Set(localIdeas.map((i) => i.id));
    return [...localIdeas, ...pipeline.filter((p) => !ids.has(p.id))];
  }, [pipeline, localIdeas]);

  const filtered = useMemo(() => {
    return allIdeas.filter((p) => {
      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      if (submitterFilter !== "All" && (p.submitter || "Unassigned") !== submitterFilter) return false;
      return true;
    });
  }, [allIdeas, statusFilter, submitterFilter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.score - a.score),
    [filtered],
  );

  const ideasInPipeline = filtered.length;
  const avgScore = filtered.length
    ? Math.round((filtered.reduce((sum, p) => sum + p.score, 0) / filtered.length) * 10) / 10
    : 0;
  const approved = filtered.filter((p) => p.status === "Approved").length;
  const rejected = filtered.filter((p) => p.status === "Rejected").length;

  const scatterData = sorted.map((p) => ({
    ...p,
    x: p.value,
    y: p.effort,
    z: Math.max(40, p.est_budget / 1000),
  }));

  async function addIdea() {
    if (!name.trim()) return;
    setSaving(true);
    const idea: PipelineIdea = {
      id: `local-${Date.now()}`,
      org_id: organization?.id || "",
      idea_name: name.trim(),
      submitter: submitter.trim() || "PMO",
      strategic_fit: s,
      value: v,
      risk: r,
      effort: e,
      score: liveScore,
      status: "New",
      est_budget: budget,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from("demand_pipeline").insert({
        org_id: organization?.id,
        idea_name: idea.idea_name,
        submitter: idea.submitter,
        strategic_fit: idea.strategic_fit,
        value: idea.value,
        risk: idea.risk,
        effort: idea.effort,
        score: idea.score,
        status: idea.status,
        est_budget: idea.est_budget,
      }).select("*").maybeSingle();
      if (!error && data?.id) {
        idea.id = data.id;
      }
    } catch {
      // table may not exist yet — keep local
    }

    setLocalIdeas((cur) => [idea, ...cur]);
    setName("");
    setSaving(false);
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="💡"
        title="Demand Pipeline"
        subtitle="Scored intake — Strategic × Value − Risk − Effort"
      />

      <SectionFrame title="Filters">
        <div className="flex flex-wrap gap-3">
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(allIdeas.map((p) => p.status))].map((st) => (
              <option key={st}>{st}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={submitterFilter}
            onChange={(e) => setSubmitterFilter(e.target.value)}
          >
            <option>All</option>
            {[...new Set(allIdeas.map((p) => p.submitter || "Unassigned"))].map((sub) => (
              <option key={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </SectionFrame>

      <SectionFrame title="Pipeline KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Ideas in Pipeline" value={ideasInPipeline} />
          <KpiCard label="Avg Score" value={avgScore || "—"} accent="#1d4ed8" />
          <KpiCard label="Approved" value={approved} accent="#16a34a" />
          <KpiCard label="Rejected" value={rejected} accent="#dc2626" />
        </div>
      </SectionFrame>

      <SectionFrame>
        <ChartCaption
          title="Value × Effort bubble"
          caption="X = Value · Y = Effort · Bubble = Budget · Colour = Strategic Fit"
        >
          {scatterData.length === 0 ? (
            <EmptyState title="No ideas" description="Score a new idea or seed the demand_pipeline table." />
          ) : (
            <div className="h-[360px]">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Value"
                    domain={[0.5, 5.5]}
                    ticks={[1, 2, 3, 4, 5]}
                    fontSize={11}
                    label={{ value: "Value", position: "insideBottom", offset: -4, fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Effort"
                    domain={[0.5, 5.5]}
                    ticks={[1, 2, 3, 4, 5]}
                    fontSize={11}
                    label={{ value: "Effort", angle: -90, position: "insideLeft", fontSize: 11 }}
                  />
                  <ZAxis type="number" dataKey="z" range={[80, 500]} name="Budget" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(val: number, key: string) => {
                      if (key === "z") return [fmtMoney(Number(val) * 1000), "Budget (~)"];
                      return [val, key === "x" ? "Value" : key === "y" ? "Effort" : key];
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.idea_name ?? ""}
                  />
                  <Scatter data={scatterData} name="Ideas">
                    {scatterData.map((d) => (
                      <Cell key={d.id} fill={fitColor(d.strategic_fit)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCaption>
      </SectionFrame>

      <SectionFrame title="Score a New Idea">
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="idea-name">Idea name</Label>
              <Input
                id="idea-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Customer portal MVP"
              />
            </div>
            <div>
              <Label htmlFor="idea-submitter">Submitter</Label>
              <Input
                id="idea-submitter"
                value={submitter}
                onChange={(e) => setSubmitter(e.target.value)}
                placeholder="Sponsor / BU"
              />
            </div>
            <div>
              <Label htmlFor="idea-budget">Est. budget ($)</Label>
              <Input
                id="idea-budget"
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Strategic Fit", val: s, set: setS },
              { label: "Value", val: v, set: setV },
              { label: "Risk", val: r, set: setR },
              { label: "Effort", val: e, set: setE },
            ].map((f) => (
              <div key={f.label}>
                <Label>{f.label} — {f.val}</Label>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[f.val]}
                  onValueChange={(x) => f.set(x[0])}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-heading">
              Live score: <strong className="text-lg tabular-nums">{liveScore}</strong>
              <span className="ml-2 text-xs text-muted-foreground">
                (S×0.3 + V×0.4 − R×0.15 − E×0.15) × 20
              </span>
            </div>
            <Button disabled={!name.trim() || saving} onClick={addIdea}>
              {saving ? "Saving…" : "Add to Pipeline"}
            </Button>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame title={`Pipeline backlog (${sorted.length})`}>
        {sorted.length === 0 ? (
          <EmptyState title="No ideas in pipeline" description="Score a new idea to start the intake queue." />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Idea</th>
                  <th>Submitter</th>
                  <th className="text-right">Strategic</th>
                  <th className="text-right">Value</th>
                  <th className="text-right">Risk</th>
                  <th className="text-right">Effort</th>
                  <th className="text-right">Score</th>
                  <th className="text-right">Budget</th>
                  <th>Decision / Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td className="font-medium">{p.idea_name}</td>
                    <td>{p.submitter || "—"}</td>
                    <td className="text-right tabular-nums">{p.strategic_fit}</td>
                    <td className="text-right tabular-nums">{p.value}</td>
                    <td className="text-right tabular-nums">{p.risk}</td>
                    <td className="text-right tabular-nums">{p.effort}</td>
                    <td className="text-right font-semibold tabular-nums">{p.score}</td>
                    <td className="text-right tabular-nums">{fmtMoney(p.est_budget)}</td>
                    <td><StatusChip status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "demand-pipeline.csv",
              sorted.map((p) => ({
                idea: p.idea_name,
                submitter: p.submitter,
                strategic_fit: p.strategic_fit,
                value: p.value,
                risk: p.risk,
                effort: p.effort,
                score: p.score,
                budget: p.est_budget,
                status: p.status,
              })),
            )
          }
        />
      </SectionFrame>
    </div>
  );
}
