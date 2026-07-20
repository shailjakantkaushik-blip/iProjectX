import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { useDomainData, type Sprint } from "@/lib/portfolio-engine";
import { exportPageCsv } from "@/lib/excel";
import {
  ChartCaption, EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton,
  SectionFrame, StatusChip,
} from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/agile")({
  component: AgilePage,
});

const METHOD_COLORS = ["#1d4ed8", "#15803d", "#f59e0b", "#8b5cf6"];

function isAgileHybrid(method?: string | null) {
  const m = (method || "").toLowerCase();
  return m === "agile" || m === "hybrid";
}

function quarterKey(d: Date) {
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

function AgilePage() {
  const { organization } = useAuth();
  const { projects, sprints, isLoading } = useDomainData(organization?.id);

  const agileProjects = useMemo(
    () => projects.filter((p) => isAgileHybrid(p.delivery_method)),
    [projects],
  );

  const agileIds = useMemo(() => new Set(agileProjects.map((p) => p.id)), [agileProjects]);

  const agileSprints = useMemo(
    () =>
      sprints
        .filter((s) => agileIds.has(s.project_id) || isAgileHybrid(
          projects.find((p) => p.id === s.project_id)?.delivery_method,
        ))
        .slice()
        .sort((a, b) => a.sprint_number - b.sprint_number || a.project_name!.localeCompare(b.project_name || "")),
    [sprints, agileIds, projects],
  );

  const projectOptions = useMemo(() => {
    const ids = [...new Set(agileSprints.map((s) => s.project_id))];
    return ids
      .map((id) => {
        const p = projects.find((x) => x.id === id);
        const name = p?.name || agileSprints.find((s) => s.project_id === id)?.project_name || id;
        return { id, name };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [agileSprints, projects]);

  const [projectId, setProjectId] = useState<string>("");
  const selectedProjectId = projectId || projectOptions[0]?.id || "";

  const projectSprints = useMemo(
    () =>
      agileSprints
        .filter((s) => s.project_id === selectedProjectId)
        .sort((a, b) => a.sprint_number - b.sprint_number),
    [agileSprints, selectedProjectId],
  );

  const [sprintId, setSprintId] = useState<string>("");
  const selectedSprint: Sprint | undefined =
    projectSprints.find((s) => s.id === sprintId) ||
    projectSprints.find((s) => s.status === "Active") ||
    projectSprints[projectSprints.length - 1];

  const completed = agileSprints.filter((s) => s.status === "Complete");
  const active = agileSprints.filter((s) => s.status === "Active");
  const avgVelocity = completed.length
    ? completed.reduce((s, x) => s + Number(x.velocity || x.completed_points || 0), 0) / completed.length
    : 0;
  const sayDo =
    completed.reduce((s, x) => s + Number(x.planned_points || 0), 0) > 0
      ? (100 *
          completed.reduce((s, x) => s + Number(x.completed_points || 0), 0)) /
        completed.reduce((s, x) => s + Number(x.planned_points || 0), 0)
      : 0;

  const thisQuarter = quarterKey(new Date());
  const pointsThisQuarter = agileSprints
    .filter((s) => {
      if (!s.end_date && !s.start_date) return false;
      const d = new Date(s.end_date || s.start_date!);
      return quarterKey(d) === thisQuarter;
    })
    .reduce((s, x) => s + Number(x.completed_points || 0), 0);

  const velocityTrend = useMemo(() => {
    const byNum = new Map<number, { sprint: string; committed: number; completed: number }>();
    for (const s of agileSprints) {
      const cur = byNum.get(s.sprint_number) || {
        sprint: `S${s.sprint_number}`,
        committed: 0,
        completed: 0,
      };
      cur.committed += Number(s.planned_points || 0);
      cur.completed += Number(s.completed_points || 0);
      byNum.set(s.sprint_number, cur);
    }
    return [...byNum.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(-8)
      .map(([, v]) => v);
  }, [agileSprints]);

  const methodMix = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      const m = p.delivery_method || "Unset";
      counts[m] = (counts[m] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [projects]);

  const burndown = useMemo(() => {
    if (!selectedSprint?.start_date || !selectedSprint?.end_date) return [];
    const start = new Date(selectedSprint.start_date);
    const end = new Date(selectedSprint.end_date);
    if (end < start) return [];
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    const n = days.length;
    const committed = Number(selectedSprint.planned_points || 0);
    const done = Number(selectedSprint.completed_points || 0);
    const status = selectedSprint.status;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return days.map((d, i) => {
      const ideal = committed - (committed * i) / Math.max(1, n - 1);
      let remaining: number | null = null;
      if (status === "Complete") {
        remaining = committed - (done * i) / Math.max(1, n - 1);
      } else if (status === "Active") {
        const elapsed = Math.max(1, Math.min(n, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1));
        if (i < elapsed) {
          remaining = committed - (done * i) / Math.max(1, elapsed - 1);
        }
      }
      return {
        day: d.toISOString().slice(5, 10),
        ideal: Math.round(ideal * 10) / 10,
        remaining: remaining == null ? null : Math.round(remaining * 10) / 10,
      };
    });
  }, [selectedSprint]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="🏃"
        title="Agile — Sprint Velocity & Burndown"
        subtitle="Agile / Hybrid projects · velocity, say/do, burndown proxy"
      />

      <SectionFrame title="Agile KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Avg Velocity" value={avgVelocity.toFixed(1)} />
          <KpiCard
            label="Say/Do Ratio"
            value={`${sayDo.toFixed(0)}%`}
            accent={sayDo >= 85 ? "#16a34a" : sayDo >= 70 ? "#f59e0b" : "#dc2626"}
          />
          <KpiCard label="Active Sprints" value={active.length} />
          <KpiCard label="Total Story Points This Quarter" value={pointsThisQuarter} />
        </div>
      </SectionFrame>

      <SectionFrame title="Project">
        {projectOptions.length === 0 ? (
          <EmptyState
            title="No agile / hybrid projects"
            description="Set Delivery Method to Agile or Hybrid on Projects, or seed the sprints table."
          />
        ) : (
          <select
            className="h-9 min-w-[260px] rounded-md border border-border bg-surface px-2 text-sm"
            value={selectedProjectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setSprintId("");
            }}
          >
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </SectionFrame>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionFrame>
          <ChartCaption title="Velocity trend (last 8 sprints)" caption="Committed vs completed story points">
            <div className="h-[300px]">
              {velocityTrend.length === 0 ? (
                <EmptyState title="No sprint history" />
              ) : (
                <ResponsiveContainer>
                  <BarChart data={velocityTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                    <XAxis dataKey="sprint" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="committed" name="Committed" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#15803d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCaption>
        </SectionFrame>

        <SectionFrame>
          <ChartCaption title="Delivery method mix" caption="All projects by delivery method">
            <div className="h-[300px]">
              {methodMix.length === 0 ? (
                <EmptyState title="No projects" />
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={methodMix} dataKey="value" nameKey="name" outerRadius={100} label>
                      {methodMix.map((d, i) => (
                        <Cell key={d.name} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCaption>
        </SectionFrame>
      </div>

      <SectionFrame>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Sprint (burndown)
            <select
              className="h-9 min-w-[200px] rounded-md border border-border bg-surface px-2 text-sm text-heading"
              value={selectedSprint?.id || ""}
              onChange={(e) => setSprintId(e.target.value)}
              disabled={!projectSprints.length}
            >
              {projectSprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sprint_name || `Sprint ${s.sprint_number}`} ({s.status})
                </option>
              ))}
            </select>
          </label>
        </div>
        <ChartCaption
          title="Sprint burndown"
          caption="Ideal vs remaining proxy from committed / completed points"
        >
          <div className="h-[320px]">
            {burndown.length === 0 ? (
              <EmptyState title="Select a sprint with dates" />
            ) : (
              <ResponsiveContainer>
                <LineChart data={burndown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.10)" />
                  <XAxis dataKey="day" fontSize={10} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#94a3b8" strokeDasharray="6 4" dot={false} />
                  <Line type="monotone" dataKey="remaining" name="Remaining" stroke="#1d4ed8" strokeWidth={2} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCaption>
      </SectionFrame>

      <SectionFrame title={`Sprint register (${projectSprints.length || agileSprints.length})`}>
        {(projectSprints.length ? projectSprints : agileSprints).length === 0 ? (
          <EmptyState title="No sprints" />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sprint</th>
                  <th>Project</th>
                  <th>Start</th>
                  <th>End</th>
                  <th className="text-right">Planned</th>
                  <th className="text-right">Completed</th>
                  <th className="text-right">Velocity</th>
                  <th className="text-right">Say/Do</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(projectSprints.length ? projectSprints : agileSprints).map((s) => (
                  <tr key={s.id}>
                    <td>{s.sprint_number}</td>
                    <td className="font-medium">{s.sprint_name || `Sprint ${s.sprint_number}`}</td>
                    <td>{s.project_name || "—"}</td>
                    <td>{s.start_date || "—"}</td>
                    <td>{s.end_date || "—"}</td>
                    <td className="text-right tabular-nums">{s.planned_points}</td>
                    <td className="text-right tabular-nums">{s.completed_points}</td>
                    <td className="text-right tabular-nums">{s.velocity}</td>
                    <td className="text-right tabular-nums">
                      {((s.say_do_ratio || 0) * (s.say_do_ratio <= 1.5 ? 100 : 1)).toFixed(0)}%
                    </td>
                    <td>
                      <StatusChip status={s.status} />
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
              "sprints.csv",
              (projectSprints.length ? projectSprints : agileSprints).map((s) => ({
                sprint_number: s.sprint_number,
                sprint_name: s.sprint_name,
                project: s.project_name,
                start_date: s.start_date,
                end_date: s.end_date,
                planned_points: s.planned_points,
                completed_points: s.completed_points,
                velocity: s.velocity,
                say_do_ratio: s.say_do_ratio,
                status: s.status,
              })),
            )
          }
        />
      </SectionFrame>
    </div>
  );
}
