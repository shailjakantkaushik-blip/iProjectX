import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatCurrency, formatPct } from "@/lib/utils";

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
      stageGates: true,
      milestones: true,
      risks: true,
    },
  });
  if (!project) notFound();

  const brief = project.brief;

  return (
    <div>
      <PageHeader
        title={project.name}
        description={`${project.code} · Project infographic & business case`}
        action={
          <Link href="/app/projects" className="text-sm font-semibold text-[var(--brand-primary)]">
            ← Back to projects
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
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
            <h3 className="font-[family-name:var(--font-display)] text-xl">Delivery snapshot</h3>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              {project.program?.name || "No program"} · {project.deliveryMethod} · {project.governanceChannel}
            </p>
            <div className="mt-4 space-y-2">
              {project.stageGates.slice(0, 6).map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm">
                  <span>{g.stage}</span>
                  <Badge>{g.gateStatus}</Badge>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="font-[family-name:var(--font-display)] text-xl">Top risks</h3>
            <div className="mt-3 space-y-2">
              {project.risks.slice(0, 4).map((r) => (
                <div key={r.id} className="rounded-lg bg-white/70 px-3 py-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{r.title}</span>
                    <Badge tone={r.rag === "Red" ? "red" : r.rag === "Amber" ? "amber" : "green"}>{r.rag}</Badge>
                  </div>
                </div>
              ))}
              {!project.risks.length ? <p className="text-sm text-[var(--ink-soft)]">No linked risks.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
