import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader, Badge } from "@/components/ui";
import { costBenefitSummary } from "@/lib/pmo/engines";
import { formatCurrency, formatPct } from "@/lib/utils";
import { ReportsClient } from "@/components/pmo/reports-client";

export default async function ReportsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const orgId = ctx.organization.id;

  const [projects, risks, decisions, actions, stageGates, benefits] = await Promise.all([
    db.project.findMany({ where: { organizationId: orgId }, orderBy: { code: "asc" } }),
    db.risk.findMany({
      where: { organizationId: orgId },
      include: { project: { select: { code: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    db.decision.findMany({
      where: { organizationId: orgId },
      include: { project: { select: { code: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.action.findMany({
      where: { organizationId: orgId },
      include: { project: { select: { code: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.stageGate.findMany({
      where: { project: { organizationId: orgId } },
      include: { project: { select: { code: true, name: true } } },
      orderBy: { plannedDate: "asc" },
    }),
    db.benefit.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" } }),
  ]);

  const cbSummary = costBenefitSummary(projects);

  const risksData = risks.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    project: r.project?.name || "Portfolio",
    probability: r.probability,
    impact: r.impact,
    score: r.probability * r.impact * r.velocity,
    status: r.status,
    owner: r.owner || "",
    rag: r.rag,
  }));

  const decisionsData = decisions.map((d) => ({
    id: d.id,
    title: d.title,
    project: d.project?.name || "Portfolio",
    status: d.status,
    owner: d.owner || "",
    decidedOn: d.decidedOn ? new Date(d.decidedOn).toLocaleDateString() : "",
    outcome: d.outcome || "",
  }));

  const actionsData = actions.map((a) => ({
    id: a.id,
    title: a.title,
    project: a.project?.name || "Portfolio",
    priority: a.priority,
    status: a.status,
    owner: a.owner || "",
    dueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "",
  }));

  const stageGatesData = stageGates.map((sg) => ({
    id: sg.id,
    project: sg.project?.name || "—",
    projectCode: sg.project?.code || "—",
    channel: sg.channel,
    stage: sg.stage,
    gateStatus: sg.gateStatus,
    plannedDate: sg.plannedDate ? new Date(sg.plannedDate).toLocaleDateString() : "",
    outcome: sg.outcome || "",
  }));

  const benefitsData = benefits.map((b) => ({
    id: b.id,
    title: b.title,
    project: b.projectName || "Portfolio",
    benefitType: b.benefitType,
    targetValue: b.targetValue,
    realisedValue: b.realisedValue,
    status: b.status,
    owner: b.owner || "",
  }));

  return (
    <div>
      <PageHeader
        title="Executive Reports"
        description="Downloadable data packs for risks, decisions, actions, stage gates, and benefits — Streamlit Reports parity."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Projects</p>
          <p className="kpi-value mt-2 text-2xl">{projects.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Open risks</p>
          <p className="kpi-value mt-2 text-2xl">
            {risks.filter((r) => r.status === "Open").length}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Open actions</p>
          <p className="kpi-value mt-2 text-2xl">
            {actions.filter((a) => a.status === "Open").length}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Portfolio cost</p>
          <p className="kpi-value mt-2 text-xl">{formatCurrency(cbSummary.cost)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">Benefit target</p>
          <p className="kpi-value mt-2 text-xl">{formatCurrency(cbSummary.benefit)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--ink-soft)]">BCR</p>
          <p className="kpi-value mt-2 text-xl">{cbSummary.bcr.toFixed(2)}</p>
        </Card>
      </div>

      <ReportsClient
        risks={risksData}
        decisions={decisionsData}
        actions={actionsData}
        stageGates={stageGatesData}
        benefits={benefitsData}
        cbSummary={{
          cost: cbSummary.cost,
          benefit: cbSummary.benefit,
          net: cbSummary.net,
          roi: formatPct(cbSummary.roi * 100),
          bcr: cbSummary.bcr.toFixed(2),
          realised: cbSummary.realised,
        }}
      />

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Presentation exports</h3>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Generate full portfolio presentation decks and PDF reports from live data.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/api/export/ppt"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110"
          >
            Download PowerPoint
          </a>
          <a
            href="/api/export/pdf"
            className="inline-flex items-center gap-2 rounded-lg bg-white/80 px-4 py-2.5 text-sm font-semibold text-[var(--ink)] ring-1 ring-[var(--line)] hover:bg-white"
          >
            Download PDF report
          </a>
        </div>
      </Card>
    </div>
  );
}
