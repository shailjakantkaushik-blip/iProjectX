import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard } from "@/components/streamlit";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/decisions")({
  component: DecisionsPage,
});

/**
 * Decisions are derived from stage-gate transitions and project status changes.
 * A dedicated `decisions` table can be added later.
 */
function DecisionsPage() {
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

  const decisions = projects.map((p) => {
    let outcome = "Proceed";
    if (p.status === "Completed") outcome = "Closed";
    else if (p.status === "Cancelled") outcome = "Cancelled";
    else if (p.rag === "Red") outcome = "Escalate";
    else if (p.rag === "Amber") outcome = "Review";
    return {
      project: p.name,
      program: p.program || "Unassigned",
      forum: "Portfolio Board",
      decisionDate: p.updated_at?.slice(0, 10) || "—",
      outcome,
      sponsor: p.sponsor || "—",
    };
  });

  const total = decisions.length;
  const proceed = decisions.filter((d) => d.outcome === "Proceed").length;
  const escalate = decisions.filter((d) => d.outcome === "Escalate").length;
  const closed = decisions.filter((d) => d.outcome === "Closed").length;

  const byOutcome = ["Proceed", "Review", "Escalate", "Closed", "Cancelled"].map((o) => ({
    outcome: o, count: decisions.filter((d) => d.outcome === o).length,
  })).filter((d) => d.count > 0);

  return (
    <div>
      <PageHeading icon="🗳️">Decisions Log</PageHeading>

      <SectionFrame>
        <SectionTitle>Decision KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total Decisions" value={total} />
          <KpiCard label="Proceed" value={proceed} />
          <KpiCard label="Escalate" value={escalate} />
          <KpiCard label="Closed" value={closed} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Outcomes</SectionTitle>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={byOutcome}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,18,32,0.08)" />
              <XAxis dataKey="outcome" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Decisions Register</SectionTitle>
        {decisions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No decisions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Project</th><th>Program</th><th>Forum</th><th>Sponsor</th><th>Outcome</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((d, i) => (
                  <tr key={i}>
                    <td className="font-medium">{d.project}</td>
                    <td>{d.program}</td>
                    <td>{d.forum}</td>
                    <td>{d.sponsor}</td>
                    <td>{d.outcome}</td>
                    <td>{d.decisionDate}</td>
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
