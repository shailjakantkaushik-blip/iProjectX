import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard, RagChip } from "@/components/streamlit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/project-infographic")({ component: Page });

function Page() {
  const { organization } = useAuth();
  const [pid, setPid] = useState<string>("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-info", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organization,
  });

  const p: any = projects.find((x: any) => x.id === pid) || projects[0];

  if (!p) {
    return (
      <div>
        <PageHeading icon="📇" title="22 · Project Infographic" subtitle="Single-page project brief." />
        <SectionFrame><div className="py-8 text-center text-sm text-muted-foreground">No projects yet.</div></SectionFrame>
      </div>
    );
  }

  const bCapex = Number(p.capex_approved || 0);
  const iCapex = Number(p.capex_incurred || 0);
  const bOpex = Number(p.opex_approved || 0);
  const iOpex = Number(p.opex_incurred || 0);
  const benefit = Number(p.benefits_target || 0);
  const cost = bCapex + bOpex;
  const roi = cost > 0 ? ((benefit - cost) / cost) * 100 : 0;

  return (
    <div>
      <PageHeading
        icon="📇"
        title="22 · Project Infographic"
        subtitle="One-page brief for stakeholders."
        actions={
          <Select value={p.id} onValueChange={setPid}>
            <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
            <SelectContent>{projects.map((x: any) => <SelectItem key={x.id} value={x.id}>{x.project_code ? `${x.project_code} · ` : ""}{x.name}</SelectItem>)}</SelectContent>
          </Select>
        }
      />

      <SectionFrame>
        <SectionTitle>Header</SectionTitle>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">{p.project_code || "—"}</div>
            <div className="text-2xl font-bold">{p.name}</div>
            <div className="text-sm text-muted-foreground mt-1">{p.program || "—"} • Sponsor: {p.sponsor || "—"}</div>
          </div>
          <RagChip rag={p.rag} label={`RAG: ${p.rag || "—"}`} />
        </div>
      </SectionFrame>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Phase" value={p.current_phase || "—"} accent="#1d4ed8" />
        <KpiCard label="Delivery" value={p.delivery_method || "—"} accent="#15803d" />
        <KpiCard label="Priority" value={p.priority ?? "—"} accent="#f59e0b" />
        <KpiCard label="ROI" value={`${roi.toFixed(0)}%`} accent="#8b5cf6" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 mt-3">
        <SectionFrame>
          <SectionTitle>Financials</SectionTitle>
          <table className="st-table">
            <tbody>
              <tr><td>Budget CAPEX</td><td>${bCapex.toLocaleString()}</td></tr>
              <tr><td>Incurred CAPEX</td><td>${iCapex.toLocaleString()}</td></tr>
              <tr><td>Budget OPEX</td><td>${bOpex.toLocaleString()}</td></tr>
              <tr><td>Incurred OPEX</td><td>${iOpex.toLocaleString()}</td></tr>
              <tr><td>Target Benefit</td><td>${benefit.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </SectionFrame>
        <SectionFrame>
          <SectionTitle>Schedule & Scope</SectionTitle>
          <table className="st-table">
            <tbody>
              <tr><td>Start</td><td>{p.start_date || "—"}</td></tr>
              <tr><td>End</td><td>{p.end_date || "—"}</td></tr>
              <tr><td>Target Go-Live</td><td>{p.target_go_live || "—"}</td></tr>
              <tr><td>Status</td><td>{p.status || "—"}</td></tr>
              <tr><td>Description</td><td className="text-xs">{p.description || "—"}</td></tr>
            </tbody>
          </table>
        </SectionFrame>
      </div>
    </div>
  );
}
