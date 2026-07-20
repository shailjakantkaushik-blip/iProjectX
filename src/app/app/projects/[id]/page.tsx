import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatCurrency, formatPct } from "@/lib/utils";
import { computeEvm } from "@/lib/pmo/analytics";
import { ProjectInfographicClient } from "@/components/pmo/project-infographic-client";

export default async function ProjectInfographicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, organizationId: ctx.organization.id },
    include: {
      program: true,
      brief: true,
      stageGates: { orderBy: { plannedDate: "asc" } },
      milestones: { orderBy: { plannedDate: "asc" } },
      risks: { orderBy: { updatedAt: "desc" } },
      decisions: { orderBy: { createdAt: "desc" }, take: 8 },
      actions: { orderBy: { dueDate: "asc" }, take: 8 },
      financialMonths: true,
    },
  });
  if (!project) notFound();

  const [phases, benefits, links, raid] = await Promise.all([
    db.phaseFinancial.findMany({
      where: { organizationId: ctx.organization.id, OR: [{ projectId: id }, { projectCode: project.code }] },
      orderBy: { stage: "asc" },
    }),
    db.benefit.findMany({
      where: { organizationId: ctx.organization.id, OR: [{ projectId: id }, { projectCode: project.code }] },
    }),
    db.projectLink.findMany({
      where: { organizationId: ctx.organization.id, OR: [{ projectId: id }, { projectCode: project.code }] },
    }),
    db.raidItem.findMany({
      where: { organizationId: ctx.organization.id, OR: [{ projectId: id }, { projectCode: project.code }] },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const evm = computeEvm(project);
  const spendPct = project.funding > 0 ? Math.round((project.spend / project.funding) * 100) : 0;
  const brief = project.brief;

  const ganttRows = [
    ...(project.startDate && project.endDate
      ? [
          {
            name: project.name,
            start: project.startDate.toISOString().slice(0, 10),
            end: project.endDate.toISOString().slice(0, 10),
            progress: project.progress,
            rag: project.rag,
          },
        ]
      : []),
    ...project.milestones
      .filter((m) => m.plannedDate)
      .map((m) => ({
        name: `◆ ${m.name}`,
        start: m.plannedDate!.toISOString().slice(0, 10),
        end: (m.actualDate || m.forecastDate || m.plannedDate)!.toISOString().slice(0, 10),
        progress: m.status === "Complete" ? 100 : 0,
        rag: m.status === "Late" ? "Red" : m.status === "Complete" ? "Green" : "Amber",
      })),
  ];

  return (
    <div>
      <PageHeader
        title={project.name}
        description={`${project.code} · Project infographic & business case — Streamlit Project Infographic parity`}
        action={
          <Link href="/app/projects" className="text-sm font-semibold text-[var(--brand-primary)]">
            ← Back to projects
          </Link>
        }
      />

      <ProjectInfographicClient
        spendPct={spendPct}
        progress={project.progress}
        ganttRows={ganttRows}
        phaseBars={phases.map((p) => ({ label: p.stage, budget: p.budget, actual: p.actual }))}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["RAG", project.rag],
          ["Stage", project.stage],
          ["Progress", formatPct(project.progress)],
          ["Funding", formatCurrency(project.funding)],
        ].map(([l, v]) => (
          <Card key={l as string}>
            <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">{l}</p>
            <p className="kpi-value mt-2 text-2xl">{v}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        {[
          ["CPI", String(evm.cpi)],
          ["SPI", String(evm.spi)],
          ["EAC", formatCurrency(evm.eac)],
          ["VAC", formatCurrency(evm.vac)],
          ["ETC", formatCurrency(evm.etc)],
        ].map(([l, v]) => (
          <Card key={l as string}>
            <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">{l}</p>
            <p className="kpi-value mt-2 text-xl">{v}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="font-[family-name:var(--font-display)] text-2xl">Business case</h3>
          {!brief ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              No business case yet. Add one via Excel import (ProjectBrief sheet) or seed data.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {[
                ["Strategic alignment", brief.strategicAlignment],
                ["Problem statement", brief.problemStatement],
                ["Proposed solution", brief.proposedSolution],
                ["Scope", brief.scope],
                ["Out of scope", brief.outOfScope],
                ["Expected benefits", brief.expectedBenefits],
                ["Key risks", brief.keyRisks],
                ["Assumptions", brief.assumptions],
                ["Success metrics", brief.successMetrics],
                ["Options considered", brief.optionsConsidered],
                ["Recommendation", brief.recommendation],
                ["Stakeholders", brief.stakeholderSummary],
              ].map(([label, body]) => (
                <div key={label as string} className="rounded-xl bg-white/70 p-4 ring-1 ring-black/5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-primary)]">
                    {label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{body || "—"}</p>
                </div>
              ))}
            </div>
          )}
          {brief ? (
            <p className="mt-4 text-sm font-semibold">
              Funding ask: {formatCurrency(brief.fundingAsk || project.funding)}
            </p>
          ) : null}
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="font-[family-name:var(--font-display)] text-xl">Stage gates</h3>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              {project.program?.name || "No program"} · {project.deliveryMethod} · {project.governanceChannel}
            </p>
            <div className="mt-4 space-y-2">
              {project.stageGates.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm">
                  <span>{g.stage}</span>
                  <Badge
                    tone={
                      g.gateStatus === "Approved" ? "green" : g.daysLate > 0 ? "red" : "amber"
                    }
                  >
                    {g.gateStatus}
                  </Badge>
                </div>
              ))}
              {!project.stageGates.length ? (
                <p className="text-sm text-[var(--ink-soft)]">No gates yet.</p>
              ) : null}
            </div>
          </Card>

          <Card>
            <h3 className="font-[family-name:var(--font-display)] text-xl">Document links</h3>
            <div className="mt-3 space-y-2">
              {links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg bg-white/70 px-3 py-2 text-sm font-medium text-[var(--brand-primary)] hover:underline"
                >
                  {l.label} · {l.linkType}
                </a>
              ))}
              {!links.length ? (
                <p className="text-sm text-[var(--ink-soft)]">No links. Add via Data Editor / Excel ProjectLinks.</p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">RAID · Risks</h3>
          <div className="mt-3 space-y-2">
            {project.risks.slice(0, 6).map((r) => (
              <div key={r.id} className="rounded-lg bg-white/70 px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{r.title}</span>
                  <Badge tone={r.rag === "Red" ? "red" : r.rag === "Amber" ? "amber" : "green"}>
                    {r.rag}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">RAID · Decisions / Actions</h3>
          <div className="mt-3 space-y-2 text-sm">
            {project.decisions.slice(0, 4).map((d) => (
              <div key={d.id} className="rounded-lg bg-white/70 px-3 py-2">
                <span className="font-medium">{d.title}</span>
                <span className="ml-2 inline-block">
                  <Badge>{d.status}</Badge>
                </span>
              </div>
            ))}
            {project.actions.slice(0, 4).map((a) => (
              <div key={a.id} className="rounded-lg bg-white/70 px-3 py-2">
                {a.title} · {a.status}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Assumptions / Issues</h3>
          <div className="mt-3 space-y-2">
            {raid.map((r) => (
              <div key={r.id} className="rounded-lg bg-white/70 px-3 py-2 text-sm">
                <Badge>{r.raidType}</Badge> {r.title}
              </div>
            ))}
            {!raid.length ? (
              <p className="text-sm text-[var(--ink-soft)]">No RAID items beyond risks/decisions.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Benefits</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Benefit</th>
                <th>Type</th>
                <th>Target</th>
                <th>Realised</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {benefits.map((b) => (
                <tr key={b.id}>
                  <td>{b.title}</td>
                  <td>{b.benefitType}</td>
                  <td>{formatCurrency(b.targetValue)}</td>
                  <td>{formatCurrency(b.realisedValue)}</td>
                  <td>{b.status}</td>
                </tr>
              ))}
              {!benefits.length ? (
                <tr>
                  <td colSpan={5} className="text-[var(--ink-soft)]">
                    Project totals — target {formatCurrency(project.benefitsTarget)}, realised{" "}
                    {formatCurrency(project.benefitsRealised)}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
