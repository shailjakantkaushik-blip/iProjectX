import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useDomainData, type StageGate } from "@/lib/domain";
import { fmtMoney } from "@/lib/portfolio-engine";
import { exportPageCsv } from "@/lib/ppt-export";
import {
  EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton, RagChip, SectionFrame,
} from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/timeline")({
  component: TimelinePage,
});

const RAG_COLOR: Record<string, string> = {
  Red: "#ef4444",
  Amber: "#f59e0b",
  Green: "#22c55e",
  Blue: "#3b82f6",
};

type Zoom = "Day" | "Week" | "Month" | "Qtr";
type ViewMode = "Portfolio" | "By Program" | "By Sponsor";

const ZOOM_MS: Record<Zoom, number> = {
  Day: 86400000,
  Week: 7 * 86400000,
  Month: 30.44 * 86400000,
  Qtr: 91.31 * 86400000,
};

function uniqueSorted(values: (string | null | undefined)[]) {
  return [...new Set(values.map((v) => (v || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
      {label}
      <select
        className="h-9 min-w-[140px] rounded-md border border-border bg-surface px-2 text-sm text-heading"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="All">All</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function axisTicks(min: number, max: number, zoom: Zoom): { t: number; label: string }[] {
  const step = ZOOM_MS[zoom];
  const span = max - min || 1;
  const maxTicks = zoom === "Day" ? 14 : zoom === "Week" ? 12 : zoom === "Month" ? 10 : 8;
  const count = Math.min(maxTicks, Math.max(2, Math.round(span / step) + 1));
  const actualStep = span / (count - 1);
  const ticks: { t: number; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const t = min + actualStep * i;
    const d = new Date(t);
    let label: string;
    if (zoom === "Day") label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    else if (zoom === "Week") label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    else if (zoom === "Month") label = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    else {
      const q = Math.floor(d.getMonth() / 3) + 1;
      label = `Q${q} '${String(d.getFullYear()).slice(2)}`;
    }
    ticks.push({ t, label });
  }
  return ticks;
}

type GanttRow = {
  id: string;
  name: string;
  program: string;
  sponsor: string;
  rag: string;
  status: string;
  start: Date;
  end: Date;
  gates: StageGate[];
};

function GanttChart({
  rows,
  zoom,
  groupLabel,
}: {
  rows: GanttRow[];
  zoom: Zoom;
  groupLabel?: string;
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const bounds = useMemo(() => {
    if (!rows.length) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const r of rows) {
      min = Math.min(min, r.start.getTime());
      max = Math.max(max, r.end.getTime());
      for (const g of r.gates) {
        if (g.planned_date) {
          const t = new Date(g.planned_date).getTime();
          if (Number.isFinite(t)) {
            min = Math.min(min, t);
            max = Math.max(max, t);
          }
        }
      }
    }
    const pad = ZOOM_MS[zoom];
    return { min: min - pad * 0.25, max: max + pad * 0.25 };
  }, [rows, zoom]);

  if (!bounds || rows.length === 0) {
    return <EmptyState title="No projects with dates" description="Add start and end dates to see the Gantt." />;
  }

  const span = bounds.max - bounds.min || 1;
  const todayPct = ((today.getTime() - bounds.min) / span) * 100;
  const ticks = axisTicks(bounds.min, bounds.max, zoom);

  return (
    <div className="space-y-2">
      {groupLabel && (
        <div className="text-[12px] font-semibold text-heading">{groupLabel}</div>
      )}
      <div className="relative ml-[180px] mb-1 h-5">
        {ticks.map((tick) => {
          const left = ((tick.t - bounds.min) / span) * 100;
          return (
            <span
              key={tick.t}
              className="absolute -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap"
              style={{ left: `${left}%` }}
            >
              {tick.label}
            </span>
          );
        })}
      </div>
      <div className="relative max-h-[70vh] overflow-auto rounded-md border border-border">
        <div className="min-w-[720px]">
          {rows.map((r) => {
            const left = ((r.start.getTime() - bounds.min) / span) * 100;
            const width = Math.max(0.8, ((r.end.getTime() - r.start.getTime()) / span) * 100);
            const color = RAG_COLOR[r.rag] || "#3b82f6";
            return (
              <div
                key={r.id}
                className="grid grid-cols-[180px_1fr] items-center border-b border-border/60 last:border-b-0"
              >
                <div className="truncate px-2 py-2 text-[11px] font-medium text-heading" title={r.name}>
                  {r.name}
                </div>
                <div className="relative h-9 bg-slate-50/80">
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div
                      className="absolute inset-y-0 z-10 w-px bg-red-500"
                      style={{ left: `${todayPct}%` }}
                      title={`Today · ${today.toLocaleDateString()}`}
                    />
                  )}
                  <div
                    className="absolute top-2 h-5 rounded-sm"
                    style={{ left: `${left}%`, width: `${width}%`, background: color, opacity: 0.88 }}
                    title={`${r.name}: ${r.start.toLocaleDateString()} → ${r.end.toLocaleDateString()} · ${r.rag}`}
                  />
                  {r.gates.map((g) => {
                    if (!g.planned_date) return null;
                    const t = new Date(g.planned_date).getTime();
                    if (!Number.isFinite(t)) return null;
                    const pct = ((t - bounds.min) / span) * 100;
                    if (pct < 0 || pct > 100) return null;
                    return (
                      <div
                        key={g.id}
                        className="absolute top-1 z-20 h-7 w-0.5 bg-slate-800"
                        style={{ left: `${pct}%` }}
                        title={`${g.stage_name} · ${g.planned_date} · ${g.status}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Bars coloured by RAG · black ticks = stage-gate planned dates · red line = today
      </p>
    </div>
  );
}

function TimelinePage() {
  const { organization } = useAuth();
  const { projects, stageGates, isLoading } = useDomainData(organization?.id);

  const [program, setProgram] = useState("All");
  const [bu, setBu] = useState("All");
  const [sponsor, setSponsor] = useState("All");
  const [rag, setRag] = useState("All");
  const [status, setStatus] = useState("All");
  const [delivery, setDelivery] = useState("All");
  const [view, setView] = useState<ViewMode>("Portfolio");
  const [zoom, setZoom] = useState<Zoom>("Month");

  const programs = useMemo(() => uniqueSorted(projects.map((p) => p.program)), [projects]);
  const sponsors = useMemo(() => uniqueSorted(projects.map((p) => p.sponsor)), [projects]);
  const rags = useMemo(() => uniqueSorted(projects.map((p) => p.rag)), [projects]);
  const statuses = useMemo(() => uniqueSorted(projects.map((p) => p.status)), [projects]);
  const deliveries = useMemo(() => uniqueSorted(projects.map((p) => p.delivery_method)), [projects]);

  const gatesByProject = useMemo(() => {
    const m = new Map<string, StageGate[]>();
    for (const g of stageGates) {
      const list = m.get(g.project_id) || [];
      list.push(g);
      m.set(g.project_id, list);
    }
    return m;
  }, [stageGates]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (program !== "All" && (p.program || "") !== program) return false;
      if (bu !== "All" && (p.program || "") !== bu) return false;
      if (sponsor !== "All" && (p.sponsor || "") !== sponsor) return false;
      if (rag !== "All" && (p.rag || "") !== rag) return false;
      if (status !== "All" && (p.status || "") !== status) return false;
      if (delivery !== "All" && (p.delivery_method || "") !== delivery) return false;
      return true;
    });
  }, [projects, program, bu, sponsor, rag, status, delivery]);

  const rows = useMemo(() => {
    const out: GanttRow[] = [];
    for (const p of filtered) {
      if (!p.start_date || !p.end_date) continue;
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      if (!(end > start)) continue;
      out.push({
        id: p.id,
        name: p.name,
        program: p.program || "Unassigned",
        sponsor: p.sponsor || "Unassigned",
        rag: p.rag || "Green",
        status: p.status || "—",
        start,
        end,
        gates: gatesByProject.get(p.id) || [],
      });
    }
    return out.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [filtered, gatesByProject]);

  const groups = useMemo(() => {
    if (view === "Portfolio") return [{ label: undefined as string | undefined, rows }];
    const key = view === "By Program" ? "program" : "sponsor";
    const map = new Map<string, GanttRow[]>();
    for (const r of rows) {
      const k = r[key];
      const list = map.get(k) || [];
      list.push(r);
      map.set(k, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, groupRows]) => ({ label, rows: groupRows }));
  }, [rows, view]);

  const kpis = useMemo(() => {
    const budget = filtered.reduce((s, p) => s + Number(p.budget || p.capex_approved || 0), 0);
    const behind = filtered.filter((p) => p.rag === "Red").length;
    const dated = rows.length;
    let min: Date | null = null;
    let max: Date | null = null;
    for (const r of rows) {
      if (!min || r.start < min) min = r.start;
      if (!max || r.end > max) max = r.end;
    }
    return { count: dated, budget, behind, min, max };
  }, [filtered, rows]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="🗓️"
        title="Portfolio Timeline"
        subtitle="Full-portfolio Gantt · RAG bars · stage-gate ticks · today marker"
      />

      <SectionFrame title="Filters">
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Program" value={program} onChange={setProgram} options={programs} />
          <FilterSelect label="BU / Program" value={bu} onChange={setBu} options={programs} />
          <FilterSelect label="Sponsor" value={sponsor} onChange={setSponsor} options={sponsors} />
          <FilterSelect label="RAG" value={rag} onChange={setRag} options={rags} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={statuses} />
          <FilterSelect label="Delivery Method" value={delivery} onChange={setDelivery} options={deliveries} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <fieldset className="flex flex-wrap items-center gap-3 text-sm">
            <legend className="sr-only">View</legend>
            <span className="text-[11px] text-muted-foreground">View</span>
            {(["Portfolio", "By Program", "By Sponsor"] as ViewMode[]).map((v) => (
              <label key={v} className="inline-flex items-center gap-1.5 text-heading">
                <input
                  type="radio"
                  name="timeline-view"
                  checked={view === v}
                  onChange={() => setView(v)}
                />
                {v}
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-wrap items-center gap-3 text-sm">
            <legend className="sr-only">Zoom</legend>
            <span className="text-[11px] text-muted-foreground">Zoom</span>
            {(["Day", "Week", "Month", "Qtr"] as Zoom[]).map((z) => (
              <label key={z} className="inline-flex items-center gap-1.5 text-heading">
                <input
                  type="radio"
                  name="timeline-zoom"
                  checked={zoom === z}
                  onChange={() => setZoom(z)}
                />
                {z}
              </label>
            ))}
          </fieldset>
        </div>
      </SectionFrame>

      <SectionFrame title="Portfolio KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard label="Projects on canvas" value={kpis.count} />
          <KpiCard label="Portfolio Budget" value={fmtMoney(kpis.budget)} />
          <KpiCard label="At Risk (Red)" value={kpis.behind} accent="#dc2626" />
          <KpiCard label="Earliest Start" value={kpis.min ? kpis.min.toLocaleDateString() : "—"} animate={false} />
          <KpiCard label="Latest End" value={kpis.max ? kpis.max.toLocaleDateString() : "—"} animate={false} />
        </div>
      </SectionFrame>

      <SectionFrame title={`Gantt · ${view} · ${zoom}`}>
        {groups.map((g) => (
          <div key={g.label || "portfolio"} className="mb-6 last:mb-0">
            <GanttChart rows={g.rows} zoom={zoom} groupLabel={g.label} />
          </div>
        ))}
      </SectionFrame>

      <SectionFrame title="Timeline register">
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Program</th>
                <th>Sponsor</th>
                <th>Start</th>
                <th>End</th>
                <th>Gates</th>
                <th>RAG</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td>{r.program}</td>
                  <td>{r.sponsor}</td>
                  <td>{r.start.toLocaleDateString()}</td>
                  <td>{r.end.toLocaleDateString()}</td>
                  <td>{r.gates.filter((g) => g.planned_date).length}</td>
                  <td><RagChip rag={r.rag} /></td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "timeline.csv",
              rows.map((r) => ({
                project: r.name,
                program: r.program,
                sponsor: r.sponsor,
                start: r.start.toISOString().slice(0, 10),
                end: r.end.toISOString().slice(0, 10),
                rag: r.rag,
                status: r.status,
                gates: r.gates.filter((g) => g.planned_date).length,
              })),
            )
          }
        />
      </SectionFrame>
    </div>
  );
}
