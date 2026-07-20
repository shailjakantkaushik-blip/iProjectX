"use client";

import { Card } from "@/components/ui";
import {
  GaugeChart,
  GanttTimelineChart,
  HorizontalBarChart,
} from "@/components/pmo/plotly-charts";

export function ProjectInfographicClient({
  spendPct,
  progress,
  ganttRows,
  phaseBars,
}: {
  spendPct: number;
  progress: number;
  ganttRows: { name: string; start: string; end: string; progress?: number; rag?: string }[];
  phaseBars: { label: string; budget: number; actual: number }[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card>
        <GaugeChart value={spendPct} title="Spend vs budget" />
      </Card>
      <Card>
        <GaugeChart value={Math.round(progress)} title="Delivery progress" />
      </Card>
      <Card>
        {phaseBars.length ? (
          <HorizontalBarChart
            title="Phase budget"
            labels={phaseBars.map((p) => p.label)}
            values={phaseBars.map((p) => p.budget)}
          />
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">No phase financials for this project yet.</p>
        )}
      </Card>
      {ganttRows.length ? (
        <Card className="xl:col-span-3">
          <GanttTimelineChart rows={ganttRows} title="Project timeline & milestones" />
        </Card>
      ) : null}
    </div>
  );
}
