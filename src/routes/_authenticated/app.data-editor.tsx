import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canEditProjects } from "@/lib/auth-context";
import { PageHeading, SectionFrame, SectionTitle, KpiCard } from "@/components/streamlit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadTemplate, exportProjects, parseWorkbook } from "@/lib/excel";
import { toast } from "sonner";
import { Upload, Download, FileDown, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/data-editor")({ component: Page });

function Page() {
  const { organization, roles } = useAuth();
  const canEdit = canEditProjects(roles);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: projects = [], refetch } = useQuery({
    queryKey: ["projects-editor", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("code");
      if (error) throw error;
      return data;
    },
    enabled: !!organization,
  });

  const filtered = projects.filter((p: any) =>
    !q || `${p.project_code} ${p.name} ${p.program} ${p.sponsor}`.toLowerCase().includes(q.toLowerCase())
  );

  const handleImport = async (file: File) => {
    if (!organization) return;
    setBusy(true);
    try {
      const rows = await parseWorkbook(file);
      if (!rows.length) { toast.error("No rows in workbook"); return; }
      const payload = rows.map((r: any) => ({ ...r, org_id: organization.id }));
      const { error } = await supabase.from("projects").insert(payload);
      if (error) throw error;
      toast.success(`Imported ${payload.length} projects`);
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <div>
      <PageHeading
        icon="✏️"
        title="13 · Data Editor"
        subtitle="Bulk operations: template download, Excel import/export, and quick project search."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadTemplate()}>
              <FileDown className="mr-1 h-4 w-4" />Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportProjects(projects)}>
              <Download className="mr-1 h-4 w-4" />Export
            </Button>
            {canEdit && (
              <>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
                <Button variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1 h-4 w-4" />{busy ? "Importing…" : "Import"}
                </Button>
                <Button asChild size="sm">
                  <Link to="/app/projects/new"><Plus className="mr-1 h-4 w-4" />New Project</Link>
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4 mb-3">
        <KpiCard label="Total Rows" value={projects.length} accent="#1d4ed8" />
        <KpiCard label="Filtered" value={filtered.length} accent="#15803d" />
        <KpiCard label="With Program" value={projects.filter((p: any) => p.program).length} accent="#f59e0b" />
        <KpiCard label="With Sponsor" value={projects.filter((p: any) => p.sponsor).length} accent="#8b5cf6" />
      </div>

      <SectionFrame>
        <SectionTitle>Search & Edit</SectionTitle>
        <div className="mb-3 max-w-sm"><Input placeholder="Search code, name, program, sponsor…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="overflow-auto">
          <table className="st-table">
            <thead><tr><th>Code</th><th>Name</th><th>Program</th><th>Sponsor</th><th>Phase</th><th>RAG</th><th>Budget CAPEX</th><th>Incurred CAPEX</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-muted-foreground py-6">No matching rows</td></tr>
              ) : filtered.map((p: any) => (
                <tr key={p.id}>
                  <td>{p.project_code || "—"}</td>
                  <td>{p.name}</td>
                  <td>{p.program || "—"}</td>
                  <td>{p.sponsor || "—"}</td>
                  <td>{p.current_phase || "—"}</td>
                  <td>{p.rag || "—"}</td>
                  <td>${Number(p.capex_approved || 0).toLocaleString()}</td>
                  <td>${Number(p.capex_incurred || 0).toLocaleString()}</td>
                  <td>{canEdit && <Link className="text-primary text-xs" to="/app/projects/$id" params={{ id: p.id }}>Edit</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFrame>
    </div>
  );
}
