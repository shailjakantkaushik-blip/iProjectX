import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard } from "@/components/streamlit";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_authenticated/app/demand-pipeline")({
  component: DemandPipelinePage,
});

type Idea = { name: string; strategic: number; value: number; risk: number; effort: number; score: number };

function score(s: number, v: number, r: number, e: number) {
  return Math.round((s * 0.3 + v * 0.4 - r * 0.15 - e * 0.15) * 20 * 10) / 10;
}

function DemandPipelinePage() {
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

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [name, setName] = useState("");
  const [s, setS] = useState(3);
  const [v, setV] = useState(3);
  const [r, setR] = useState(2);
  const [e, setE] = useState(3);

  const proposed = projects.filter((p) => p.status === "Not Started" || p.current_phase === "Ideation");
  const approved = projects.filter((p) => p.status !== "Not Started");

  const totalScore = ideas.length > 0 ? Math.round(ideas.reduce((sum, i) => sum + i.score, 0) / ideas.length) : 0;

  const chartData = [
    ...ideas.map((i) => ({ name: i.name, score: i.score })),
    ...proposed.slice(0, 10).map((p) => ({
      name: p.name,
      score: score(3, p.priority === "High" ? 5 : p.priority === "Medium" ? 3 : 2, 2, 3),
    })),
  ].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <div>
      <PageHeading icon="💡">Demand Pipeline</PageHeading>
      <div className="text-sm text-muted-foreground mb-4">
        Score new ideas and rank the intake queue before committing to the portfolio.
      </div>

      <SectionFrame>
        <SectionTitle>Pipeline KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Proposed / Ideation" value={proposed.length} />
          <KpiCard label="Approved" value={approved.length} />
          <KpiCard label="Scored Ideas" value={ideas.length} />
          <KpiCard label="Avg Priority Score" value={totalScore || "—"} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Score a New Idea</SectionTitle>
        <div className="grid gap-4">
          <div>
            <Label>Idea name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Customer portal MVP" />
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
                <Slider min={1} max={5} step={1} value={[f.val]} onValueChange={(x) => f.set(x[0])} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm">Priority Score: <strong>{score(s, v, r, e)}</strong></div>
            <Button
              disabled={!name.trim()}
              onClick={() => {
                setIdeas((cur) => [...cur, { name, strategic: s, value: v, risk: r, effort: e, score: score(s, v, r, e) }]);
                setName("");
              }}
            >
              Add to Pipeline
            </Button>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Top-Ranked Intake</SectionTitle>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis type="number" domain={[0, 100]} fontSize={11} />
              <YAxis type="category" dataKey="name" width={160} fontSize={11} />
              <Tooltip />
              <Bar dataKey="score" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionFrame>

      {ideas.length > 0 && (
        <SectionFrame>
          <SectionTitle>Scored Ideas ({ideas.length})</SectionTitle>
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Idea</th><th>Strategic</th><th>Value</th><th>Risk</th><th>Effort</th><th>Score</th>
                </tr>
              </thead>
              <tbody>
                {ideas.map((i, k) => (
                  <tr key={k}>
                    <td className="font-medium">{i.name}</td>
                    <td>{i.strategic}</td>
                    <td>{i.value}</td>
                    <td>{i.risk}</td>
                    <td>{i.effort}</td>
                    <td>{i.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionFrame>
      )}
    </div>
  );
}
