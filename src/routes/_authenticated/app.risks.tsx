import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { riskBand, useDomainData } from "@/lib/domain";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton, RagChip,
  SectionFrame, SectionTitle, StatusChip,
} from "@/components/streamlit";
import { exportPageCsv } from "@/lib/ppt-export";

export const Route = createFileRoute("/_authenticated/app/risks")({
  component: RisksPage,
});

function RisksPage() {
  const { organization } = useAuth();
  const { risks, isLoading, projects } = useDomainData(organization?.id);
  const [projectFilter, setProjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(() => {
    return risks.filter((r) => {
      if (projectFilter !== "All" && r.project_name !== projectFilter) return false;
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      return true;
    });
  }, [risks, projectFilter, statusFilter]);

  const high = filtered.filter((r) => r.score >= 40).length;
  const medium = filtered.filter((r) => r.score >= 25 && r.score < 40).length;
  const low = filtered.filter((r) => r.score < 25).length;
  const overdue = filtered.filter((r) => r.due_date && new Date(r.due_date) < new Date() && r.status === "Open").length;

  const heatmap = useMemo(() => {
    const grid: { p: number; i: number; count: number }[] = [];
    for (let p = 1; p <= 5; p++) for (let i = 1; i <= 5; i++) grid.push({ p, i, count: 0 });
    for (const r of filtered) {
      const cell = grid.find((c) => c.p === r.probability && c.i === r.impact);
      if (cell) cell.count++;
    }
    return grid;
  }, [filtered]);

  const top10 = [...filtered].sort((a, b) => b.score - a.score).slice(0, 10).map((r) => ({
    name: r.title.length > 28 ? r.title.slice(0, 28) + "…" : r.title,
    score: r.score,
  }));

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="⚠️"
        title="Risk Intelligence"
        subtitle="P × I × Velocity scoring · Red ≥50 · Amber 25–49 · Green <25"
      />

      <SectionFrame title="Filters">
        <div className="flex flex-wrap gap-3">
          <select className="h-9 rounded-md border border-border bg-surface px-2 text-sm" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option>All</option>
            {[...new Set(risks.map((r) => r.project_name).filter(Boolean))].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select className="h-9 rounded-md border border-border bg-surface px-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option>
            {[...new Set(risks.map((r) => r.status))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </SectionFrame>

      <SectionFrame title="Risk KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard label="Total Risks" value={filtered.length} />
          <KpiCard label="High (≥40)" value={high} accent="#dc2626" />
          <KpiCard label="Medium" value={medium} accent="#f59e0b" />
          <KpiCard label="Low" value={low} accent="#16a34a" />
          <KpiCard label="Overdue Mitigations" value={overdue} accent="#dc2626" />
        </div>
      </SectionFrame>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionFrame>
          <ChartCaption title="Probability × Impact heatmap" caption="Cell colour green→red; number = risk count">
            <div className="grid grid-cols-6 gap-1 text-center text-[11px]">
              <div />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="font-semibold text-muted-foreground">I{i}</div>
              ))}
              {[5, 4, 3, 2, 1].map((p) => (
                <Fragment key={p}>
                  <div className="flex items-center justify-center font-semibold text-muted-foreground">P{p}</div>
                  {[1, 2, 3, 4, 5].map((i) => {
                    const cell = heatmap.find((c) => c.p === p && c.i === i)!;
                    const intensity = Math.min(1, cell.count / 3);
                    const bg = cell.count === 0
                      ? "#f1f5f9"
                      : `color-mix(in srgb, #dc2626 ${Math.round(20 + intensity * 70)}%, #16a34a)`;
                    return (
                      <div
                        key={`${p}-${i}`}
                        className="flex h-10 items-center justify-center rounded-md font-bold text-heading"
                        style={{ background: bg }}
                      >
                        {cell.count || ""}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </ChartCaption>
        </SectionFrame>

        <SectionFrame>
          <ChartCaption title="Top 10 risks by score" caption="Score = Probability × Impact × Velocity">
            <div className="h-[320px]">
              <ResponsiveContainer>
                <BarChart data={top10} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={140} fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="score" radius={4}>
                    {top10.map((d) => (
                      <Cell key={d.name} fill={d.score >= 50 ? "#dc2626" : d.score >= 25 ? "#f59e0b" : "#16a34a"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCaption>
        </SectionFrame>
      </div>

      <SectionFrame title={`Risk register (${filtered.length})`}>
        {filtered.length === 0 ? (
          <EmptyState title="No risks" description="Risks appear once projects are loaded or the risks table is seeded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Score</th><th>Title</th><th>Project</th><th>P</th><th>I</th><th>V</th>
                  <th>Owner</th><th>Mitigation</th><th>Status</th><th>Due</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((r) => (
                    <tr key={r.id}>
                      <td><RagChip rag={riskBand(r.score)} label={String(r.score)} /></td>
                      <td className="font-medium">{r.title}</td>
                      <td>{r.project_name || "—"}</td>
                      <td>{r.probability}</td>
                      <td>{r.impact}</td>
                      <td>{r.velocity}</td>
                      <td>{r.owner || "—"}</td>
                      <td className="max-w-[200px] truncate">{r.mitigation || "—"}</td>
                      <td><StatusChip status={r.status} /></td>
                      <td>{r.due_date || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "risks.csv",
              filtered.map((r) => ({
                score: r.score, title: r.title, project: r.project_name, probability: r.probability,
                impact: r.impact, velocity: r.velocity, owner: r.owner, status: r.status, due_date: r.due_date,
              })),
            )
          }
        />
      </SectionFrame>
      <p className="text-[11px] text-muted-foreground">{projects.length} projects in FY filter scope.</p>
    </div>
  );
}
