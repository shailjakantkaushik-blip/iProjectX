"use client";

import { useState } from "react";
import { GanttTimelineChart } from "@/components/pmo/plotly-charts";

type Project = {
  id: string;
  name: string;
  code: string;
  startDate: string | null;
  endDate: string | null;
  rag: string;
  progress: number;
  portfolioCategory?: string | null;
  theme?: string | null;
  businessUnit?: string | null;
  program?: string | null;
  priority?: string | null;
  governanceChannel?: string | null;
};

const GROUP_OPTIONS = [
  { value: "none", label: "All projects (flat)" },
  { value: "portfolioCategory", label: "Portfolio Category" },
  { value: "theme", label: "Theme" },
  { value: "businessUnit", label: "Business Unit" },
  { value: "program", label: "Program" },
  { value: "rag", label: "RAG" },
  { value: "priority", label: "Priority" },
  { value: "governanceChannel", label: "Governance Channel" },
] as const;

type GroupBy = (typeof GROUP_OPTIONS)[number]["value"];

export function TimelineClient({ projects }: { projects: Project[] }) {
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  const dated = projects.filter((p) => p.startDate && p.endDate);

  const rows = dated.map((p) => {
    let group: string | undefined;
    if (groupBy !== "none") {
      const val = p[groupBy as keyof Project];
      group = typeof val === "string" ? val : (val == null ? "Unassigned" : String(val));
    }
    return {
      name: `${p.code} ${p.name}`,
      start: new Date(p.startDate!).toISOString().slice(0, 10),
      end: new Date(p.endDate!).toISOString().slice(0, 10),
      progress: p.progress,
      rag: p.rag,
      group,
    };
  });

  const sortedRows =
    groupBy === "none"
      ? rows
      : [...rows].sort((a, b) => {
          const ga = a.group || "zzz";
          const gb = b.group || "zzz";
          if (ga !== gb) return ga.localeCompare(gb);
          return a.start.localeCompare(b.start);
        });

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
          Group by
        </label>
        <select
          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupBy)}
        >
          {GROUP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-[var(--ink-soft)]">{sortedRows.length} projects with dates</span>
      </div>

      {sortedRows.length > 0 ? (
        <GanttTimelineChart rows={sortedRows} title="Portfolio timeline" />
      ) : (
        <p className="text-sm text-[var(--ink-soft)]">
          No projects with start and end dates. Import data or edit projects to add dates.
        </p>
      )}
    </div>
  );
}
