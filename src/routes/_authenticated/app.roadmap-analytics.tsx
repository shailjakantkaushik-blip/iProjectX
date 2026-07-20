import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard } from "@/components/streamlit";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts";

export const Route = createFileRoute("/_authenticated/app/roadmap-analytics")({
  component: RoadmapAnalyticsPage,
});

function RoadmapAnalyticsPage() {
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

  // Projects starting per quarter
  const quarters = new Map<string, { q: string; start: number; end: number }>();
  const qKey = (d: Date) => `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
  for (const p of projects as any[]) {
    if (p.start_date) {
      const k = qKey(new Date(p.start_date));
      const r = quarters.get(k) ?? { q: k, start: 0, end: 0 };
      r.start += 1; quarters.set(k, r);
    }
    if (p.end_date) {
      const k = qKey(new Date(p.end_date));
      const r = quarters.get(k) ?? { q: k, start: 0, end: 0 };
      r.end += 1; quarters.set(k, r);
    }
  }
  const flow = Array.from(quarters.values()).sort((a, b) => a.q.localeCompare(b.q));

  // Duration buckets (months)
  const buckets = [
    { name: "< 3m", min: 0, max: 3 },
    { name: "3-6m", min: 3, max: 6 },
    { name: "6-12m", min: 6, max: 12 },
    { name: "12m+", min: 12, max: Infinity },
  ].map(b => ({ ...b, count: 0 }));
  for (const p of projects as any[]) {
    if (!p.start_date || !p.end_date) continue;
    const months = (new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    const b = buckets.find(x => months >= x.min && months < x.max);
    if (b) b.count += 1;
  }

  return (
    <div className="space-y-6">
      <PageHeading title="Roadmap Analytics" subtitle="Portfolio flow, cadence, and duration profile" />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Projects" value={projects.length} />
        <KpiCard label="Quarters Covered" value={flow.length} />
        <KpiCard label="Avg Starts/Quarter" value={flow.length ? (flow.reduce((s, f) => s + f.start, 0) / flow.length).toFixed(1) : "0"} />
        <KpiCard label="Avg Ends/Quarter" value={flow.length ? (flow.reduce((s, f) => s + f.end, 0) / flow.length).toFixed(1) : "0"} />
      </div>

      <SectionFrame>
        <SectionTitle>Starts vs Completions by Quarter</SectionTitle>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={flow}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--st-border)" />
            <XAxis dataKey="q" /><YAxis />
            <Tooltip /><Legend />
            <Line type="monotone" dataKey="start" name="Starts" stroke="var(--st-accent)" strokeWidth={2} />
            <Line type="monotone" dataKey="end" name="Completions" stroke="var(--st-success)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Duration Profile</SectionTitle>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={buckets}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--st-border)" />
            <XAxis dataKey="name" /><YAxis />
            <Tooltip /><Bar dataKey="count" fill="var(--st-accent)" />
          </BarChart>
        </ResponsiveContainer>
      </SectionFrame>
    </div>
  );
}
