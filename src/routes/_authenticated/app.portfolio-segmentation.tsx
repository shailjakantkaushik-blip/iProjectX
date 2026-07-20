import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard } from "@/components/streamlit";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/app/portfolio-segmentation")({
  component: SegmentationPage,
});

const COLORS = ["#1d4ed8", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316"];

function SegmentationPage() {
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

  const bucket = (key: string) => {
    const m = new Map<string, number>();
    for (const p of projects as any[]) {
      const k = p[key] || "Unassigned";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m, ([name, value]) => ({ name, value }));
  };

  const byProgram = bucket("program");
  const bySponsor = bucket("sponsor");
  const byPriority = bucket("priority");
  const byDelivery = bucket("delivery_method");

  return (
    <div className="space-y-6">
      <PageHeading title="Portfolio Segmentation" subtitle="Composition by program, sponsor, priority, and delivery method" />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Programs" value={byProgram.length} />
        <KpiCard label="Sponsors" value={bySponsor.length} />
        <KpiCard label="Priorities" value={byPriority.length} />
        <KpiCard label="Delivery Methods" value={byDelivery.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionFrame>
          <SectionTitle>By Program</SectionTitle>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byProgram} dataKey="value" nameKey="name" outerRadius={100} label>
                {byProgram.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </SectionFrame>

        <SectionFrame>
          <SectionTitle>By Sponsor</SectionTitle>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bySponsor} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--st-border)" />
              <XAxis type="number" /><YAxis type="category" dataKey="name" width={140} />
              <Tooltip /><Bar dataKey="value" fill="var(--st-accent)" />
            </BarChart>
          </ResponsiveContainer>
        </SectionFrame>

        <SectionFrame>
          <SectionTitle>By Priority</SectionTitle>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byPriority} dataKey="value" nameKey="name" outerRadius={100} label>
                {byPriority.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </SectionFrame>

        <SectionFrame>
          <SectionTitle>By Delivery Method</SectionTitle>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byDelivery}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--st-border)" />
              <XAxis dataKey="name" /><YAxis />
              <Tooltip /><Bar dataKey="value" fill="var(--st-success)" />
            </BarChart>
          </ResponsiveContainer>
        </SectionFrame>
      </div>
    </div>
  );
}
