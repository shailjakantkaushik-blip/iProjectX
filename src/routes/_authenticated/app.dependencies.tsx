import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/dependencies")({
  component: DependenciesPage,
});

/**
 * Dependencies are derived from shared program/sponsor pairs — projects sharing
 * both a program and a sponsor are considered dependent. A dedicated
 * `dependencies` table can replace this heuristic later.
 */
function DependenciesPage() {
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

  const deps: {
    from: string; to: string; program: string; sponsor: string;
    fromRag?: string | null; toRag?: string | null; status: string;
  }[] = [];
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i], b = projects[j];
      if (a.program && a.program === b.program && a.sponsor && a.sponsor === b.sponsor) {
        const blocked = a.rag === "Red" || b.rag === "Red";
        deps.push({
          from: a.name, to: b.name,
          program: a.program, sponsor: a.sponsor || "—",
          fromRag: a.rag, toRag: b.rag,
          status: blocked ? "Blocked" : "Active",
        });
      }
    }
  }

  const total = deps.length;
  const blocked = deps.filter((d) => d.status === "Blocked").length;
  const active = total - blocked;

  const byProgram = Array.from(
    deps.reduce((m: Map<string, number>, d) => m.set(d.program, (m.get(d.program) || 0) + 1), new Map()).entries(),
  ).map(([program, count]) => ({ program, count })).sort((a, b) => b.count - a.count);

  return (
    <div>
      <PageHeading icon="🔗">Dependencies</PageHeading>

      <SectionFrame>
        <SectionTitle>Dependency KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total Links" value={total} />
          <KpiCard label="Active" value={active} />
          <KpiCard label="Blocked" value={blocked} />
          <KpiCard label="Cross-Program" value={0} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Dependency Density by Program</SectionTitle>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={byProgram}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="program" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Dependency Register ({deps.length})</SectionTitle>
        {deps.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No dependencies detected. Projects sharing a program + sponsor will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>From</th><th>From RAG</th><th>To</th><th>To RAG</th>
                  <th>Program</th><th>Sponsor</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {deps.map((d, i) => (
                  <tr key={i}>
                    <td className="font-medium">{d.from}</td>
                    <td><RagChip rag={d.fromRag} /></td>
                    <td className="font-medium">{d.to}</td>
                    <td><RagChip rag={d.toRag} /></td>
                    <td>{d.program}</td>
                    <td>{d.sponsor}</td>
                    <td>{d.status}</td>
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
