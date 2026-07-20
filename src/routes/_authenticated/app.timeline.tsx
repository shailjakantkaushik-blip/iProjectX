import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/timeline")({
  component: TimelinePage,
});

const RAG_COLOR: Record<string, string> = {
  Red: "#ef4444", Amber: "#f59e0b", Green: "#22c55e",
};

function TimelinePage() {
  const { organization } = useAuth();
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("start_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!organization,
  });

  const dated = projects
    .map((p) => ({ ...p, s: p.start_date ? new Date(p.start_date) : null, e: p.end_date ? new Date(p.end_date) : null }))
    .filter((p) => p.s && p.e && p.e! > p.s!);

  const minDate = dated.reduce((m, p) => (m && m < p.s! ? m : p.s!), null as Date | null);
  const maxDate = dated.reduce((m, p) => (m && m > p.e! ? m : p.e!), null as Date | null);
  const span = minDate && maxDate ? maxDate.getTime() - minDate.getTime() : 1;

  const today = new Date();
  const todayPct = minDate && maxDate ? Math.min(100, Math.max(0, ((today.getTime() - minDate.getTime()) / span) * 100)) : 0;

  const behind = dated.filter((p) => p.rag === "Red").length;
  const overBudget = projects.filter((p) => Number(p.capex_incurred || 0) + Number(p.opex_incurred || 0) > Number(p.budget || 0) && Number(p.budget || 0) > 0).length;

  return (
    <div>
      <PageHeading icon="🗓️">Portfolio Timeline</PageHeading>
      <div className="text-sm text-muted-foreground mb-4">
        Every project on one canvas — bars coloured by RAG, red line marks today.
      </div>

      <SectionFrame>
        <SectionTitle>Portfolio KPIs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Projects" value={dated.length} />
          <KpiCard label="Portfolio Start" value={minDate ? minDate.toLocaleDateString() : "—"} />
          <KpiCard label="Portfolio End" value={maxDate ? maxDate.toLocaleDateString() : "—"} />
          <KpiCard label="At Risk" value={behind} sub={`${overBudget} over budget`} />
        </div>
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Portfolio Swim-Lane</SectionTitle>
        {dated.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No projects with start & end dates yet.
          </div>
        ) : (
          <div className="relative">
            <div className="relative border-y border-border py-2" style={{ minHeight: dated.length * 32 + 20 }}>
              <div
                className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
                style={{ left: `${todayPct}%` }}
                title={`Today · ${today.toLocaleDateString()}`}
              />
              {dated.map((p, i) => {
                const left = ((p.s!.getTime() - minDate!.getTime()) / span) * 100;
                const width = Math.max(0.5, ((p.e!.getTime() - p.s!.getTime()) / span) * 100);
                const color = RAG_COLOR[p.rag || "Green"] || "#3b82f6";
                return (
                  <div key={p.id} className="relative h-7 flex items-center" style={{ top: i * 4 }}>
                    <div
                      className="absolute h-5 rounded"
                      style={{ left: `${left}%`, width: `${width}%`, background: color, opacity: 0.85 }}
                      title={`${p.name} · ${p.s!.toLocaleDateString()} → ${p.e!.toLocaleDateString()}`}
                    />
                    <div
                      className="absolute text-[11px] font-medium truncate max-w-[40%] pl-2"
                      style={{ left: `${Math.min(left + width + 1, 60)}%`, top: 6 }}
                    >
                      {p.name}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
              <span>{minDate?.toLocaleDateString()}</span>
              <span className="text-red-600">Today · {today.toLocaleDateString()}</span>
              <span>{maxDate?.toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </SectionFrame>

      <SectionFrame>
        <SectionTitle>Timeline Register</SectionTitle>
        <div className="overflow-x-auto">
          <table className="st-table">
            <thead>
              <tr>
                <th>Project</th><th>Program</th><th>Start</th><th>End</th>
                <th>Duration</th><th>Phase</th><th>RAG</th>
              </tr>
            </thead>
            <tbody>
              {dated.map((p) => {
                const days = Math.round((p.e!.getTime() - p.s!.getTime()) / (86400 * 1000));
                return (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.program || "—"}</td>
                    <td>{p.s!.toLocaleDateString()}</td>
                    <td>{p.e!.toLocaleDateString()}</td>
                    <td>{days}d</td>
                    <td>{p.current_phase || "—"}</td>
                    <td><RagChip rag={p.rag} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
