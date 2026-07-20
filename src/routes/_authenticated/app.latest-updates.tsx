import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/latest-updates")({
  component: LatestUpdatesPage,
});

function LatestUpdatesPage() {
  const { organization } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organization,
  });

  const recent = (projects as any[]).slice(0, 25);

  const in7 = new Date(Date.now() - 7 * 86400000);
  const thisWeek = (projects as any[]).filter(p => p.updated_at && new Date(p.updated_at) >= in7);

  return (
    <div className="space-y-6">
      <PageHeading title="Latest Updates" subtitle="Recent project changes and status refresh" />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Updated (7d)" value={thisWeek.length} accent="var(--st-accent)" />
        <KpiCard label="Total Projects" value={projects.length} />
        <KpiCard label="At Risk" value={(projects as any[]).filter(p => p.rag === "Red" || p.rag === "Amber").length} accent="var(--st-warning)" />
      </div>

      <SectionFrame>
        <SectionTitle>Recent Activity</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr><th>ID</th><th>Project</th><th>Program</th><th>Manager</th><th>RAG</th><th>Last Updated</th></tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id}>
                  <td>{p.project_id || p.id}</td>
                  <td>{p.name}</td>
                  <td>{p.program || "—"}</td>
                  <td>{p.project_manager || "—"}</td>
                  <td><RagChip rag={(p.rag || "Green") as any} /></td>
                  <td>{p.updated_at ? new Date(p.updated_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
