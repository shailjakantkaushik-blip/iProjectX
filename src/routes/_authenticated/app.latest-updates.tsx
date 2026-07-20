import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useDomainData, type ActivityLog } from "@/lib/portfolio-engine";
import { supabase } from "@/integrations/supabase/client";
import { exportPageCsv } from "@/lib/excel";
import {
  EmptyState, ExportBar, KpiCard, PageHeading, PageSkeleton, SectionFrame,
} from "@/components/streamlit";

export const Route = createFileRoute("/_authenticated/app/latest-updates")({
  component: LatestUpdatesPage,
});

const ENTITY_BORDER: Record<string, string> = {
  project: "#2563eb",
  risk: "#dc2626",
  decision: "#7c3aed",
  action: "#ea580c",
  benefit: "#15803d",
  release: "#0891b2",
  sprint: "#0d9488",
};

function borderFor(entity?: string | null): string {
  const key = (entity || "").toLowerCase();
  return ENTITY_BORDER[key] || "#64748b";
}

function LatestUpdatesPage() {
  const { organization, profile } = useAuth();
  const { activity, projects, isLoading } = useDomainData(organization?.id);
  const [localExtra, setLocalExtra] = useState<ActivityLog[]>([]);
  const [projectFilter, setProjectFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [impactFilter, setImpactFilter] = useState("All");
  const [publishOpen, setPublishOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    details: "",
    project_id: "",
    entity_type: "project",
    impact: "Medium",
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const feed = useMemo(() => {
    const merged = [...activity, ...localExtra];
    return merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [activity, localExtra]);

  const projectNames = useMemo(
    () => [...new Set(feed.map((a) => a.project_name).filter(Boolean) as string[])].sort(),
    [feed],
  );
  const categories = useMemo(
    () => [...new Set(feed.map((a) => a.entity_type).filter(Boolean))].sort(),
    [feed],
  );
  const impacts = useMemo(
    () => [...new Set(feed.map((a) => a.impact).filter(Boolean) as string[])].sort(),
    [feed],
  );

  const filtered = useMemo(() => {
    return feed.filter((a) => {
      if (projectFilter !== "All" && a.project_name !== projectFilter) return false;
      if (categoryFilter !== "All" && a.entity_type !== categoryFilter) return false;
      if (impactFilter !== "All" && a.impact !== impactFilter) return false;
      return true;
    });
  }, [feed, projectFilter, categoryFilter, impactFilter]);

  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = filtered.filter((a) => new Date(a.created_at).getTime() >= weekAgo).length;
  const highImpact = filtered.filter((a) => (a.impact || "").toLowerCase() === "high").length;

  async function onPublish(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !organization?.id) return;
    setSaving(true);
    setSaveMsg(null);
    const project = projects.find((p) => p.id === form.project_id);
    const row: ActivityLog = {
      id: `local-${Date.now()}`,
      org_id: organization.id,
      project_id: form.project_id || null,
      entity_type: form.entity_type,
      action: "publish",
      title: form.title.trim(),
      details: form.details.trim() || null,
      actor_name: profile?.full_name || profile?.email || "PMO",
      impact: form.impact,
      created_at: new Date().toISOString(),
      project_name: project?.name,
    };
    setLocalExtra((prev) => [row, ...prev]);
    setForm({ title: "", details: "", project_id: "", entity_type: "project", impact: "Medium" });
    setPublishOpen(false);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("activity_log").insert({
        org_id: organization.id,
        project_id: row.project_id,
        entity_type: row.entity_type,
        action: row.action,
        title: row.title,
        details: row.details,
        actor_name: row.actor_name,
        impact: row.impact,
        created_at: row.created_at,
      });
      setSaveMsg(error ? `Saved locally (DB insert skipped: ${error.message})` : "Published to activity feed");
    } catch (err) {
      setSaveMsg(`Saved locally (DB unavailable: ${err instanceof Error ? err.message : "error"})`);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeading
        icon="📣"
        title="Latest Updates"
        subtitle="Chronological activity feed across projects, risks, and decisions"
        actions={
          <button
            type="button"
            className="export-btn"
            onClick={() => setPublishOpen((v) => !v)}
          >
            {publishOpen ? "Cancel" : "➕ Publish update"}
          </button>
        }
      />

      <SectionFrame title="Filters">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Project
            <select
              className="h-9 min-w-[160px] rounded-md border border-border bg-surface px-2 text-sm text-heading"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option>All</option>
              {projectNames.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Category / entity
            <select
              className="h-9 min-w-[140px] rounded-md border border-border bg-surface px-2 text-sm text-heading"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option>All</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Impact
            <select
              className="h-9 min-w-[120px] rounded-md border border-border bg-surface px-2 text-sm text-heading"
              value={impactFilter}
              onChange={(e) => setImpactFilter(e.target.value)}
            >
              <option>All</option>
              {impacts.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </label>
        </div>
      </SectionFrame>

      {publishOpen && (
        <SectionFrame title="Publish update">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={onPublish}>
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:col-span-2">
              Title
              <input
                required
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-heading"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Short headline"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Project
              <select
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-heading"
                value={form.project_id}
                onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
              >
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Entity type
              <select
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-heading"
                value={form.entity_type}
                onChange={(e) => setForm((f) => ({ ...f, entity_type: e.target.value }))}
              >
                {["project", "risk", "decision", "action", "benefit", "release", "general"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
              Impact
              <select
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-heading"
                value={form.impact}
                onChange={(e) => setForm((f) => ({ ...f, impact: e.target.value }))}
              >
                {["High", "Medium", "Low", "Info"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:col-span-2">
              Details
              <textarea
                className="min-h-[80px] rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-heading"
                value={form.details}
                onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                placeholder="Describe the update, impact, next steps…"
              />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="export-btn" disabled={saving}>
                {saving ? "Saving…" : "Publish"}
              </button>
            </div>
          </form>
        </SectionFrame>
      )}
      {saveMsg && <p className="mb-3 text-[12px] text-muted-foreground">{saveMsg}</p>}

      <SectionFrame title="Activity KPIs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard label="Updates shown" value={filtered.length} />
          <KpiCard label="Last 7 days" value={thisWeek} />
          <KpiCard label="High impact" value={highImpact} accent="#dc2626" />
        </div>
      </SectionFrame>

      <SectionFrame title="Activity feed">
        {filtered.length === 0 ? (
          <EmptyState title="No updates" description="Activity appears from the domain feed or when you publish above." />
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => (
              <article
                key={a.id}
                className="rounded-[10px] border border-border bg-surface px-4 py-3 shadow-sm"
                style={{ borderLeftWidth: 4, borderLeftColor: borderFor(a.entity_type) }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-heading">{a.title}</h3>
                  <time className="text-[11px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </time>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="font-medium capitalize text-heading">{a.entity_type}</span>
                  <span>·</span>
                  <span>{a.project_name || "Portfolio"}</span>
                  {a.impact && (
                    <>
                      <span>·</span>
                      <span
                        style={{
                          color:
                            (a.impact || "").toLowerCase() === "high"
                              ? "#dc2626"
                              : (a.impact || "").toLowerCase() === "medium"
                                ? "#f59e0b"
                                : "#64748b",
                          fontWeight: 600,
                        }}
                      >
                        {a.impact}
                      </span>
                    </>
                  )}
                  {a.actor_name && (
                    <>
                      <span>·</span>
                      <span>by {a.actor_name}</span>
                    </>
                  )}
                </div>
                {a.details && <p className="mt-2 text-sm text-muted-foreground">{a.details}</p>}
              </article>
            ))}
          </div>
        )}
        <ExportBar
          onCsv={() =>
            exportPageCsv(
              "latest-updates.csv",
              filtered.map((a) => ({
                created_at: a.created_at,
                title: a.title,
                entity_type: a.entity_type,
                project: a.project_name,
                impact: a.impact,
                actor: a.actor_name,
                details: a.details,
              })),
            )
          }
        />
      </SectionFrame>
    </div>
  );
}
