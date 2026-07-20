import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canEditProjects } from "@/lib/auth-context";
import { useDomainData } from "@/lib/portfolio-engine";
import {
  PageHeading, PageSkeleton, SectionFrame, SectionTitle, KpiCard, SortableSheet,
  type SheetColumn,
} from "@/components/streamlit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  downloadTemplate, exportFullWorkbook, exportProjects, parseFullWorkbook, parseWorkbook,
} from "@/lib/excel";
import { toast } from "sonner";
import { Upload, Download, FileDown, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/data-editor")({ component: Page });

type Row = Record<string, unknown> & { id: string };

function simpleCols(keys: { key: string; header: string }[]): SheetColumn<Row>[] {
  return keys.map(({ key, header }) => ({
    key,
    header,
    sortValue: (r) => {
      const v = r[key];
      if (typeof v === "number") return v;
      return String(v ?? "");
    },
    cell: (r) => {
      const v = r[key];
      if (v == null || v === "") return "—";
      if (typeof v === "number") return Number.isInteger(v) ? v : Math.round(v * 10) / 10;
      return String(v);
    },
  }));
}

function Page() {
  const { organization, roles } = useAuth();
  const canEdit = canEditProjects(roles);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    projects,
    risks,
    actions,
    decisions,
    benefits,
    stageGates,
    dependencies,
    sprints,
    releases,
    pipeline,
    isLoading,
    refetch,
  } = useDomainData(organization?.id);

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          !q ||
          `${p.project_code} ${p.name} ${p.program} ${p.sponsor}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [projects, q],
  );

  const handleImport = async (file: File) => {
    if (!organization) return;
    setBusy(true);
    try {
      const [rows, full] = await Promise.all([parseWorkbook(file), parseFullWorkbook(file)]);
      if (!rows.length) {
        toast.error("No project rows in workbook");
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = rows.map((r: any) => ({ ...r, org_id: organization.id }));
      const { error } = await supabase.from("projects").insert(payload);
      if (error) throw error;
      const extra =
        full.risks.length +
        full.actions.length +
        full.decisions.length +
        full.benefits.length +
        full.stageGates.length;
      toast.success(
        `Imported ${payload.length} projects` +
          (extra ? ` (${extra} other sheet row(s) detected — domain upsert coming soon)` : ""),
      );
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleExportFull = () => {
    exportFullWorkbook({
      projects,
      risks,
      actions,
      decisions,
      benefits,
      stageGates,
      dependencies,
      sprints,
      releases,
      pipeline,
    });
  };

  if (isLoading) return <PageSkeleton />;

  const projectRows = filteredProjects as unknown as Row[];
  const riskRows = risks as unknown as Row[];
  const actionRows = actions as unknown as Row[];
  const decisionRows = decisions as unknown as Row[];
  const benefitRows = benefits as unknown as Row[];
  const gateRows = stageGates as unknown as Row[];
  const depRows = dependencies as unknown as Row[];
  const sprintRows = sprints as unknown as Row[];
  const releaseRows = releases as unknown as Row[];
  const pipelineRows = pipeline as unknown as Row[];

  return (
    <div>
      <PageHeading
        icon="✏️"
        title="13 · Data Editor"
        subtitle="Tabbed domain sheets with Excel import/export (Part4-aligned workbook)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadTemplate()}>
              <FileDown className="mr-1 h-4 w-4" />Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportProjects(projects)}>
              <Download className="mr-1 h-4 w-4" />Export Projects
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportFull}>
              <Download className="mr-1 h-4 w-4" />Export Full
            </Button>
            {canEdit && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  hidden
                  onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
                />
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

      <div className="mb-3 grid gap-3 md:grid-cols-5">
        <KpiCard label="Projects" value={projects.length} accent="#1d4ed8" />
        <KpiCard label="Risks" value={risks.length} accent="#dc2626" />
        <KpiCard label="Actions" value={actions.length} accent="#f59e0b" />
        <KpiCard label="Decisions" value={decisions.length} accent="#0f766e" />
        <KpiCard label="Stage Gates" value={stageGates.length} accent="#15803d" />
      </div>

      <SectionFrame>
        <SectionTitle>Domain Sheets</SectionTitle>
        <Tabs defaultValue="projects">
          <TabsList className="mb-3 flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
            <TabsTrigger value="stageGates">Stage Gates</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="sprints">Sprints</TabsTrigger>
            <TabsTrigger value="releases">Releases</TabsTrigger>
            <TabsTrigger value="pipeline">Demand Pipeline</TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <div className="mb-3 max-w-sm">
              <Input
                placeholder="Search code, name, program, sponsor…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <SortableSheet
              rows={projectRows}
              rowKey={(r) => String(r.id)}
              initialSortKey="project_code"
              maxRows={200}
              columns={[
                ...simpleCols([
                  { key: "project_code", header: "Code" },
                  { key: "name", header: "Name" },
                  { key: "program", header: "Program" },
                  { key: "sponsor", header: "Sponsor" },
                  { key: "current_phase", header: "Phase" },
                  { key: "rag", header: "RAG" },
                  { key: "capex_approved", header: "Budget CAPEX" },
                  { key: "capex_incurred", header: "Incurred CAPEX" },
                ]),
                {
                  key: "edit",
                  header: "",
                  cell: (r) =>
                    canEdit ? (
                      <Link className="text-xs text-primary" to="/app/projects/$id" params={{ id: String(r.id) }}>
                        Edit
                      </Link>
                    ) : null,
                },
              ]}
              emptyMessage="No matching projects"
            />
          </TabsContent>

          <TabsContent value="risks">
            <SortableSheet
              rows={riskRows}
              rowKey={(r) => String(r.id)}
              initialSortKey="score"
              maxRows={200}
              columns={simpleCols([
                { key: "title", header: "Title" },
                { key: "project_name", header: "Project" },
                { key: "probability", header: "P (1-5)" },
                { key: "impact", header: "I (1-5)" },
                { key: "velocity", header: "V (1-5)" },
                { key: "score", header: "Score" },
                { key: "owner", header: "Owner" },
                { key: "status", header: "Status" },
              ])}
              emptyMessage="No risks"
            />
          </TabsContent>

          <TabsContent value="actions">
            <SortableSheet
              rows={actionRows}
              rowKey={(r) => String(r.id)}
              initialSortKey="due_date"
              maxRows={200}
              columns={simpleCols([
                { key: "title", header: "Title" },
                { key: "project_name", header: "Project" },
                { key: "owner", header: "Owner" },
                { key: "due_date", header: "Due" },
                { key: "priority", header: "Priority" },
                { key: "status", header: "Status" },
              ])}
              emptyMessage="No actions"
            />
          </TabsContent>

          <TabsContent value="decisions">
            <SortableSheet
              rows={decisionRows}
              rowKey={(r) => String(r.id)}
              initialSortKey="title"
              maxRows={200}
              columns={simpleCols([
                { key: "title", header: "Title" },
                { key: "type", header: "Type" },
                { key: "project_name", header: "Project" },
                { key: "decision_maker", header: "Owner" },
                { key: "status", header: "Status" },
                { key: "due_date", header: "Due" },
              ])}
              emptyMessage="No decisions"
            />
          </TabsContent>

          <TabsContent value="benefits">
            <SortableSheet
              rows={benefitRows}
              rowKey={(r) => String(r.id)}
              initialSortKey="name"
              maxRows={200}
              columns={simpleCols([
                { key: "name", header: "Benefit" },
                { key: "project_name", header: "Project" },
                { key: "category", header: "Category" },
                { key: "type", header: "Type" },
                { key: "target_value", header: "Target" },
                { key: "realised_value", header: "Realised" },
                { key: "status", header: "Status" },
              ])}
              emptyMessage="No benefits"
            />
          </TabsContent>

          <TabsContent value="stageGates">
            <SortableSheet
              rows={gateRows}
              rowKey={(r) => String(r.id)}
              initialSortKey="planned_date"
              maxRows={200}
              columns={simpleCols([
                { key: "project_name", header: "Project" },
                { key: "stage_name", header: "Stage" },
                { key: "status", header: "Status" },
                { key: "gate_owner", header: "Owner" },
                { key: "planned_date", header: "Planned" },
                { key: "actual_date", header: "Actual" },
                { key: "checklist_pct", header: "Checklist %" },
              ])}
              emptyMessage="No stage gates"
            />
          </TabsContent>

          <TabsContent value="dependencies">
            <SortableSheet
              rows={depRows}
              rowKey={(r) => String(r.id)}
              initialSortKey="type"
              maxRows={200}
              columns={simpleCols([
                { key: "from_name", header: "From" },
                { key: "to_name", header: "To" },
                { key: "type", header: "Type" },
                { key: "status", header: "Status" },
                { key: "impact", header: "Impact" },
                { key: "needed_by", header: "Needed By" },
              ])}
              emptyMessage="No dependencies"
            />
          </TabsContent>

          <TabsContent value="sprints">
            <SortableSheet
              rows={sprintRows}
              rowKey={(r) => String(r.id)}
              initialSortKey="sprint_number"
              maxRows={200}
              columns={simpleCols([
                { key: "project_name", header: "Project" },
                { key: "sprint_name", header: "Sprint" },
                { key: "sprint_number", header: "#" },
                { key: "planned_points", header: "Committed" },
                { key: "completed_points", header: "Completed" },
                { key: "velocity", header: "Velocity" },
                { key: "status", header: "Status" },
              ])}
              emptyMessage="No sprints"
            />
          </TabsContent>

          <TabsContent value="releases">
            <SortableSheet
              rows={releaseRows}
              rowKey={(r) => String(r.id)}
              initialSortKey="planned_date"
              maxRows={200}
              columns={simpleCols([
                { key: "release_name", header: "Release" },
                { key: "project_name", header: "Project" },
                { key: "version", header: "Version" },
                { key: "type", header: "Type" },
                { key: "planned_date", header: "Planned" },
                { key: "status", header: "Status" },
                { key: "owner", header: "Owner" },
              ])}
              emptyMessage="No releases"
            />
          </TabsContent>

          <TabsContent value="pipeline">
            <SortableSheet
              rows={pipelineRows}
              rowKey={(r) => String(r.id)}
              initialSortKey="score"
              maxRows={200}
              columns={simpleCols([
                { key: "idea_name", header: "Idea" },
                { key: "submitter", header: "Submitter" },
                { key: "strategic_fit", header: "Fit" },
                { key: "value", header: "Value" },
                { key: "risk", header: "Risk" },
                { key: "effort", header: "Effort" },
                { key: "score", header: "Score" },
                { key: "status", header: "Status" },
                { key: "est_budget", header: "Est. Budget" },
              ])}
              emptyMessage="No pipeline ideas"
            />
          </TabsContent>
        </Tabs>
      </SectionFrame>
    </div>
  );
}
