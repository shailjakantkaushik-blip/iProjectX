import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canEditProjects, isAdmin } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Download, FileDown } from "lucide-react";
import { toast } from "sonner";
import { downloadTemplate, exportProjects, parseWorkbook } from "@/lib/excel";

export const Route = createFileRoute("/_authenticated/app/projects")({
  component: ProjectsList,
});

const ragClass = (r: string | null) =>
  r === "Green" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" :
  r === "Amber" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
  r === "Red"   ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" :
  "bg-muted";

function ProjectsList() {
  const { organization, roles } = useAuth();
  const canEdit = canEditProjects(roles);
  const admin = isAdmin(roles);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organization,
  });

  const filtered = projects.filter((p) =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.project_code ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const onImport = async (file: File) => {
    if (!organization) return;
    setBusy(true);
    try {
      const rows = await parseWorkbook(file);
      if (rows.length === 0) return toast.error("No rows found");
      const payload = rows.map((r) => ({ ...r, org_id: organization.id }));
      const { error } = await supabase.from("projects").insert(payload as never);
      if (error) throw error;
      toast.success(`Imported ${rows.length} projects`);
      qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const totalBudget = projects.reduce((s, p) => s + Number(p.budget || 0), 0);
  const active = projects.filter((p) => p.status === "In Progress").length;
  const atRisk = projects.filter((p) => p.rag === "Red" || p.rag === "Amber").length;
  const completed = projects.filter((p) => p.status === "Completed").length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-heading">📁 Project Register</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}><FileDown className="mr-2 h-4 w-4" />Template</Button>
          {admin && (
            <>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Upload className="mr-2 h-4 w-4" />Import
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => exportProjects(projects)} disabled={projects.length === 0}>
            <Download className="mr-2 h-4 w-4" />Export
          </Button>
          {admin && (
            <Link to="/app/projects/new"><Button size="sm"><Plus className="mr-2 h-4 w-4" />New</Button></Link>
          )}
        </div>
      </div>

      <div className="section-frame">
        <div className="section-title">Register KPIs</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="kpi-card"><div className="kpi-label">Projects</div><div className="kpi-value">{projects.length}</div></div>
          <div className="kpi-card"><div className="kpi-label">Active</div><div className="kpi-value">{active}</div></div>
          <div className="kpi-card"><div className="kpi-label">Completed</div><div className="kpi-value">{completed}</div></div>
          <div className="kpi-card"><div className="kpi-label">At Risk</div><div className="kpi-value">{atRisk}</div></div>
          <div className="kpi-card"><div className="kpi-label">Total Budget</div><div className="kpi-value">${(totalBudget / 1_000_000).toFixed(1)}M</div></div>
        </div>
      </div>

      <div className="section-frame">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="section-title !mb-0 !border-b-0 !pb-0">Portfolio Register</div>
          <Input placeholder="Search by name or code…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No projects. {admin ? "Import from Excel or click New." : "Ask your admin to add projects."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Project ID</th>
                  <th>Project Name</th>
                  <th>Program</th>
                  <th>Sponsor</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>RAG</th>
                  <th>Current Phase</th>
                  <th>Method</th>
                  <th className="text-right">Budget</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-[11px]">{p.project_code || "—"}</td>
                    <td>
                      {canEdit ? (
                        <Link to="/app/projects/$id" params={{ id: p.id }} className="font-medium text-primary hover:underline">{p.name}</Link>
                      ) : <span className="font-medium">{p.name}</span>}
                    </td>
                    <td>{p.program || "—"}</td>
                    <td>{p.sponsor || "—"}</td>
                    <td>{p.priority || "—"}</td>
                    <td>{p.status}</td>
                    <td><Badge className={ragClass(p.rag)}>{p.rag ?? "—"}</Badge></td>
                    <td>{p.current_phase || "—"}</td>
                    <td>{p.delivery_method || "—"}</td>
                    <td className="text-right tabular-nums">${Number(p.budget || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

