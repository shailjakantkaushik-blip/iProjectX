import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/app/executive")({
  component: ExecutiveDashboard,
});

const RAG_COLORS: Record<string, string> = { Green: "#15803d", Amber: "#f59e0b", Red: "#dc2626" };
const CHART_PALETTE = ["#1d4ed8", "#15803d", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];

function money(n: number) {
  return "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
}

function ExecutiveDashboard() {
  const { organization } = useAuth();
  const [program, setProgram] = useState("All");
  const [sponsor, setSponsor] = useState("All");
  const [priority, setPriority] = useState("All");
  const [status, setStatus] = useState("All");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!organization,
  });

  const opts = (col: string) => ["All", ...Array.from(new Set(projects.map((p: any) => p[col]).filter(Boolean)))].sort();

  const filtered = useMemo(() => {
    return projects.filter((p: any) =>
      (program === "All" || p.program === program) &&
      (sponsor === "All" || p.sponsor === sponsor) &&
      (priority === "All" || p.priority === priority) &&
      (status === "All" || p.status === status)
    );
  }, [projects, program, sponsor, priority, status]);

  const totalBudget = filtered.reduce((s, p) => s + Number(p.budget || 0), 0);
  const capexApproved = filtered.reduce((s, p) => s + Number(p.capex_approved || 0), 0);
  const capexIncurred = filtered.reduce((s, p) => s + Number(p.capex_incurred || 0), 0);
  const capexForecast = filtered.reduce((s, p) => s + Number(p.capex_approved || 0) * 1.05, 0);
  const remaining = capexApproved - capexIncurred;
  const benefitsRealised = filtered.reduce((s, p) => s + Number(p.benefits_realised || 0), 0);
  const active = filtered.filter((p: any) => p.status === "In Progress").length;
  const completed = filtered.filter((p: any) => p.status === "Completed").length;
  const overdue = filtered.filter((p: any) => {
    if (!p.end_date) return false;
    return new Date(p.end_date) < new Date() && p.status !== "Completed";
  }).length;

  const kpis: [string, string | number][] = [
    ["CAPEX Approved", money(capexApproved)],
    ["Incurred", money(capexIncurred)],
    ["Forecast", money(capexForecast)],
    ["Remaining", money(remaining)],
    ["Active", active],
    ["Completed", completed],
    ["Overdue", overdue],
    ["Benefits", money(benefitsRealised)],
  ];

  const ragData = ["Green", "Amber", "Red"].map((r) => ({
    name: r, value: filtered.filter((p: any) => p.rag === r).length,
  })).filter((d) => d.value > 0);

  const statusData = ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"].map((s) => ({
    status: s, count: filtered.filter((p: any) => p.status === s).length,
  }));

  const priorityData = ["Critical", "High", "Medium", "Low"].map((p) => ({
    priority: p, count: filtered.filter((x: any) => x.priority === p).length,
  }));

  const programData = Array.from(
    filtered.reduce((m: Map<string, number>, p: any) => {
      const k = p.program || "Unassigned";
      m.set(k, (m.get(k) || 0) + Number(p.budget || 0));
      return m;
    }, new Map()),
  ).map(([program, budget]) => ({ program, budget }));

  const topROI = filtered
    .map((p: any) => {
      const cost = Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0);
      const benefit = Number(p.benefits_realised || 0);
      const roi = cost > 0 ? ((benefit - cost) / cost) * 100 : 0;
      return { name: (p.name || "").slice(0, 22), roi: Math.round(roi * 10) / 10 };
    })
    .filter((x) => x.roi !== 0)
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10);

  const spendVsBudget = filtered.slice(0, 10).map((p: any) => ({
    name: (p.name || "").slice(0, 15),
    budget: Number(p.budget || 0),
    incurred: Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0),
  }));

  return (
    <div>
      <SectionFrame>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="mr-auto page-heading">📊 PMO Portfolio — Executive Summary</div>
          {[
            ["Program", program, setProgram, opts("program")],
            ["Sponsor", sponsor, setSponsor, opts("sponsor")],
            ["Priority", priority, setPriority, opts("priority")],
            ["Status", status, setStatus, opts("status")],
          ].map(([label, val, setter, options]: any) => (
            <select
              key={label}
              value={val}
              onChange={(e) => setter(e.target.value)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
            >
              <option value="All">{label}: All</option>
              {options.filter((o: string) => o !== "All").map((o: string) => (
                <option key={o} value={o}>{label}: {o}</option>
              ))}
            </select>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Key Metrics</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {kpis.map(([lbl, val]) => (
            <KpiCard key={lbl} label={lbl} value={val} />
          ))}
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Portfolio Analytics</SectionTitle>
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ChartBox title="RAG Status">
              <PieChart>
                <Pie data={ragData} dataKey="value" nameKey="name" outerRadius={70} label>
                  {ragData.map((e) => <Cell key={e.name} fill={RAG_COLORS[e.name]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ChartBox>

            <ChartBox title="Status Distribution">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
                <XAxis dataKey="status" fontSize={10} />
                <YAxis allowDecimals={false} fontSize={10} />
                <Tooltip />
                <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartBox>

            <ChartBox title="Priority Mix">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
                <XAxis dataKey="priority" fontSize={10} />
                <YAxis allowDecimals={false} fontSize={10} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartBox>

            <ChartBox title="Budget by Program">
              <BarChart data={programData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
                <XAxis dataKey="program" fontSize={10} />
                <YAxis fontSize={10} tickFormatter={(v) => money(v)} />
                <Tooltip formatter={(v: any) => money(Number(v))} />
                <Bar dataKey="budget" fill="#15803d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartBox>

            <ChartBox title="Top 10 by ROI %">
              {topROI.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No ROI data</div>
              ) : (
                <BarChart data={topROI} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
                  <XAxis type="number" fontSize={10} />
                  <YAxis type="category" dataKey="name" fontSize={9} width={110} />
                  <Tooltip formatter={(v: any) => `${v}%`} />
                  <Bar dataKey="roi" fill="#15803d" radius={[0, 4, 4, 0]} />
                </BarChart>
              )}
            </ChartBox>

            <ChartBox title="Budget vs Incurred (Top 10)">
              <BarChart data={spendVsBudget}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
                <XAxis dataKey="name" fontSize={9} />
                <YAxis fontSize={10} tickFormatter={(v) => money(v)} />
                <Tooltip formatter={(v: any) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="budget" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="incurred" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartBox>
          </div>
        )}
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Portfolio Timelines</SectionTitle>
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No projects match filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Project</th><th>Program</th><th>Status</th><th>RAG</th>
                  <th>Start</th><th>End</th><th>Budget</th><th>Incurred</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((p: any) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.program ?? "—"}</td>
                    <td>{p.status ?? "—"}</td>
                    <td><RagChip rag={p.rag} /></td>
                    <td>{p.start_date ?? "—"}</td>
                    <td>{p.end_date ?? "—"}</td>
                    <td>{money(Number(p.budget || 0))}</td>
                    <td>{money(Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionFrame>
    </div>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-md border border-border bg-surface p-2">
      <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="h-56">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
