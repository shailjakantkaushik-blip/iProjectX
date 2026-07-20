import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard } from "@/components/streamlit";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/resources")({
  component: ResourcesPage,
});

function ResourcesPage() {
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

  const bySponsor = Array.from(
    projects.reduce((m: Map<string, { sponsor: string; count: number; budget: number }>, p) => {
      const k = p.sponsor || "Unassigned";
      const cur = m.get(k) || { sponsor: k, count: 0, budget: 0 };
      cur.count++;
      cur.budget += Number(p.budget || 0);
      m.set(k, cur);
      return m;
    }, new Map()).values(),
  ).sort((a, b) => b.count - a.count);

  const uniqueSponsors = bySponsor.length;
  const uniquePMs = new Set(projects.map((p) => p.pm_user_id).filter(Boolean)).size;
  const avgPerSponsor = uniqueSponsors > 0 ? (projects.length / uniqueSponsors).toFixed(1) : "0";

  return (
    <div>
      <PageHeading icon="👥">Resource Capacity & Skill Intelligence</PageHeading>

      <SectionFrame>
        <SectionTitle>Resource KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Sponsors" value={uniqueSponsors} />
          <KpiCard label="Project Managers" value={uniquePMs} />
          <KpiCard label="Projects / Sponsor" value={avgPerSponsor} />
          <KpiCard label="Total Projects" value={projects.length} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Load by Sponsor</SectionTitle>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={bySponsor} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis type="number" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="sponsor" fontSize={10} width={140} />
              <Tooltip />
              <Bar dataKey="count" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Sponsor Register</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>Sponsor</th>
                <th className="text-right">Projects</th>
                <th className="text-right">Total Budget</th>
                <th className="text-right">Avg Budget</th>
              </tr>
            </thead>
            <tbody>
              {bySponsor.map((s) => (
                <tr key={s.sponsor}>
                  <td className="font-medium">{s.sponsor}</td>
                  <td className="text-right tabular-nums">{s.count}</td>
                  <td className="text-right tabular-nums">${s.budget.toLocaleString()}</td>
                  <td className="text-right tabular-nums">${(s.budget / s.count).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">
          Skill matrix & FTE allocation require a dedicated <code>resources</code> table — coming in a later phase.
        </div>
      </SectionFrame>
    </div>
  );
}
