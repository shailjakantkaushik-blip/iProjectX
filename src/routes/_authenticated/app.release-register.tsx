import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/release-register")({
  component: ReleaseRegisterPage,
});

function ReleaseRegisterPage() {
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

  const today = new Date();
  const in90 = new Date(today.getTime() + 90 * 86400000);

  const releases = (projects as any[])
    .filter(p => p.end_date)
    .map(p => ({
      id: p.project_id || p.id,
      name: p.name,
      program: p.program || "—",
      rag: p.rag || "Green",
      end: new Date(p.end_date),
      stage: p.stage_gate || p.status || "—",
    }))
    .sort((a, b) => a.end.getTime() - b.end.getTime());

  const upcoming = releases.filter(r => r.end >= today && r.end <= in90);
  const overdue = releases.filter(r => r.end < today);

  return (
    <div className="space-y-6">
      <PageHeading title="Release Register" subtitle="Planned go-lives and delivery cutovers" />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Total Releases" value={releases.length} />
        <KpiCard label="Next 90 Days" value={upcoming.length} accent="var(--st-accent)" />
        <KpiCard label="Overdue" value={overdue.length} accent="var(--st-danger)" />
        <KpiCard label="At Risk (Amber/Red)" value={releases.filter(r => r.rag !== "Green").length} accent="var(--st-warning)" />
      </div>

      <SectionFrame>
        <SectionTitle>Release Schedule</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr><th>ID</th><th>Project</th><th>Program</th><th>Stage</th><th>Target Release</th><th>RAG</th></tr>
            </thead>
            <tbody>
              {releases.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.name}</td>
                  <td>{r.program}</td>
                  <td>{r.stage}</td>
                  <td>{r.end.toLocaleDateString()}</td>
                  <td><RagChip rag={r.rag as any} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
