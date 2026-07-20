import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { exportPageCsv } from "@/lib/excel";
import { useDomainData, CHANNEL_A_STAGES, CHANNEL_B_STAGES, fmtMoney, progressPct } from "@/lib/portfolio-engine";
import {
  EmptyState, ExportBar, PageHeading, PageSkeleton, RagChip, SectionFrame,
} from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/project-infographic")({
  component: ProjectInfographicPage,
});

function ProgressRing({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="#ffffff"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
        {clamped}%
      </div>
    </div>
  );
}

function ProjectInfographicPage() {
  const { organization } = useAuth();
  const { projects, risks, decisions, stageGates, isLoading } = useDomainData(organization?.id);
  const [pid, setPid] = useState("");

  const p = projects.find((x) => x.id === pid) || projects[0];

  const progress = useMemo(() => {
    if (!p) return 0;
    if (p.progress_pct != null && Number.isFinite(Number(p.progress_pct))) {
      return Math.round(Number(p.progress_pct));
    }
    return progressPct(p);
  }, [p]);

  const budget = p
    ? Number(p.budget || 0) || Number(p.capex_approved || 0) + Number(p.opex_approved || 0)
    : 0;
  const incurred = p ? Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0) : 0;
  const benefits = p ? Number(p.benefits_target || 0) : 0;
  const goLive = p?.target_go_live || p?.end_date || "—";

  const projectGates = useMemo(() => {
    if (!p) return [];
    return stageGates
      .filter((g) => g.project_id === p.id)
      .sort((a, b) => (a.planned_date || "").localeCompare(b.planned_date || ""));
  }, [stageGates, p]);

  const stages = useMemo(() => {
    if (projectGates.length > 0) return projectGates.map((g) => g.stage_name);
    const channel = (p?.governance_channel || "").toLowerCase();
    return channel.includes("channel a") || channel.includes("<$200")
      ? CHANNEL_A_STAGES
      : CHANNEL_B_STAGES;
  }, [projectGates, p]);

  const currentStageIdx = useMemo(() => {
    if (!p) return 0;
    if (projectGates.length) {
      const idx = projectGates.findIndex((g) => {
        const s = g.status.toLowerCase();
        return s.includes("progress") || s.includes("pending");
      });
      if (idx >= 0) return idx;
    }
    const phase = (p.current_phase || "").toLowerCase();
    const idx = stages.findIndex((s) => s.toLowerCase().includes(phase.slice(0, 4)) || phase.includes(s.toLowerCase().slice(0, 4)));
    return idx >= 0 ? idx : Math.min(2, stages.length - 1);
  }, [p, projectGates, stages]);

  const topRisks = useMemo(() => {
    if (!p) return [];
    return risks
      .filter((r) => r.project_id === p.id)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [risks, p]);

  const pendingDecisions = useMemo(() => {
    if (!p) return [];
    return decisions
      .filter((d) => d.project_id === p.id)
      .filter((d) => {
        const s = (d.status || "").toLowerCase();
        return s.includes("pending") || s.includes("open") || s.includes("await");
      })
      .slice(0, 3);
  }, [decisions, p]);

  const nextGates = useMemo(() => {
    if (!p) return [];
    const today = new Date().toISOString().slice(0, 10);
    return projectGates
      .filter((g) => {
        const s = g.status.toLowerCase();
        if (s.includes("approv") || s.includes("complete")) return false;
        return !g.planned_date || g.planned_date >= today || s.includes("progress") || s.includes("pending");
      })
      .sort((a, b) => (a.planned_date || "9999").localeCompare(b.planned_date || "9999"))
      .slice(0, 3);
  }, [projectGates, p]);

  const preparedOn = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (isLoading) return <PageSkeleton />;

  if (!p) {
    return (
      <div>
        <PageHeading icon="📇" title="Project Infographic" subtitle="Single-page project poster for stakeholders." />
        <SectionFrame>
          <EmptyState title="No projects yet" />
        </SectionFrame>
      </div>
    );
  }

  return (
    <div>
      <PageHeading
        icon="📇"
        title="Project Infographic"
        subtitle="Printable one-page poster brief"
        actions={
          <select
            className="h-9 min-w-[220px] rounded-md border border-border bg-surface px-2 text-sm"
            value={p.id}
            onChange={(e) => setPid(e.target.value)}
          >
            {projects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.project_code ? `${x.project_code} · ` : ""}{x.name}
              </option>
            ))}
          </select>
        }
      />

      <div className="print-poster rounded-[12px] border border-border bg-surface shadow-sm overflow-hidden">
        {/* Header band */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 text-white"
          style={{
            background: "linear-gradient(120deg, #0f172a 0%, #1d4ed8 55%, #0f766e 100%)",
          }}
        >
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-white/70">
              {p.project_code || "Project"} · {p.program || "—"}
            </div>
            <h2 className="truncate text-2xl font-bold leading-tight">{p.name}</h2>
            <div className="mt-1 text-sm text-white/85">Sponsor: {p.sponsor || "—"}</div>
          </div>
          <div className="flex items-center gap-4">
            <RagChip rag={p.rag} label={`RAG · ${p.rag || "—"}`} />
            <ProgressRing pct={progress} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_280px]">
          <div className="border-b border-border p-5 lg:border-b-0 lg:border-r">
            {/* KPI tiles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Budget", fmtMoney(budget)],
                ["Incurred", fmtMoney(incurred)],
                ["Benefits", fmtMoney(benefits)],
                ["Go-Live", goLive === "—" ? "—" : new Date(goLive).toLocaleDateString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-slate-50 px-3 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-heading">{value}</div>
                </div>
              ))}
            </div>

            {/* Timeline strip */}
            <div className="mt-5">
              <div className="mb-2 text-[12px] font-semibold text-heading">Stage timeline</div>
              <div className="flex flex-wrap gap-2">
                {stages.map((stage, i) => {
                  const active = i === currentStageIdx;
                  const done = i < currentStageIdx;
                  return (
                    <div
                      key={`${stage}-${i}`}
                      className="min-w-[88px] flex-1 rounded-md border px-2 py-2 text-center text-[11px]"
                      style={{
                        borderColor: active ? "#1d4ed8" : done ? "#16a34a" : "rgba(11,18,32,0.12)",
                        background: active ? "rgba(29,78,216,0.10)" : done ? "rgba(22,163,74,0.08)" : "#fff",
                        fontWeight: active ? 700 : 500,
                        color: active ? "#1d4ed8" : done ? "#15803d" : undefined,
                      }}
                    >
                      {stage}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Current phase: {p.current_phase || stages[currentStageIdx] || "—"} · Status: {p.status || "—"}
              </p>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4 p-5">
            <div>
              <div className="mb-2 text-[12px] font-semibold text-heading">Top 3 Risks</div>
              {topRisks.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No open risks.</p>
              ) : (
                <ol className="space-y-2 text-[12px]">
                  {topRisks.map((r, i) => (
                    <li key={r.id} className="rounded-md border border-border px-2 py-1.5">
                      <span className="font-semibold text-muted-foreground">{i + 1}. </span>
                      {r.title}
                      <div className="text-[10px] text-muted-foreground">Score {r.score} · {r.status}</div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div>
              <div className="mb-2 text-[12px] font-semibold text-heading">Top 3 Decisions Pending</div>
              {pendingDecisions.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No pending decisions.</p>
              ) : (
                <ol className="space-y-2 text-[12px]">
                  {pendingDecisions.map((d, i) => (
                    <li key={d.id} className="rounded-md border border-border px-2 py-1.5">
                      <span className="font-semibold text-muted-foreground">{i + 1}. </span>
                      {d.title}
                      <div className="text-[10px] text-muted-foreground">
                        {d.due_date || "No due date"} · {d.status}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div>
              <div className="mb-2 text-[12px] font-semibold text-heading">Next 3 Gates / Milestones</div>
              {nextGates.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No upcoming gates.</p>
              ) : (
                <ol className="space-y-2 text-[12px]">
                  {nextGates.map((g, i) => (
                    <li key={g.id} className="rounded-md border border-border px-2 py-1.5">
                      <span className="font-semibold text-muted-foreground">{i + 1}. </span>
                      {g.stage_name}
                      <div className="text-[10px] text-muted-foreground">
                        {g.planned_date || "TBD"} · {g.status}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-slate-50 px-5 py-3 text-[12px]">
          <span className="text-muted-foreground">Prepared on {preparedOn}</span>
          <button
            type="button"
            className="export-btn print:hidden"
            onClick={() => window.print()}
          >
            📄 Export as PDF
          </button>
        </div>
      </div>

      <ExportBar
        onCsv={() =>
          exportPageCsv("project-infographic.csv", [
            {
              project: p.name,
              sponsor: p.sponsor,
              rag: p.rag,
              progress,
              budget,
              incurred,
              benefits,
              go_live: goLive,
            },
          ])
        }
        onPdf={() => window.print()}
      />

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-poster, .print-poster * { visibility: visible !important; }
          .print-poster {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
