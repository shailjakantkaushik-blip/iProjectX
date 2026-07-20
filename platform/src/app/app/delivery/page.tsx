import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";

export default async function DeliveryPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const projects = await db.project.findMany({
    where: { organizationId: ctx.organization.id },
    include: {
      stageGates: { orderBy: { stage: "asc" } },
      milestones: { orderBy: { plannedDate: "asc" } },
    },
    orderBy: { code: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Delivery"
        description="Stage-gate compliance, milestone cadence, and Channel A/B governance in one view."
      />

      <div className="space-y-5">
        {projects.map((project) => (
          <Card key={project.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl">{project.name}</h3>
                <p className="text-sm text-[var(--ink-soft)]">
                  {project.code} · {project.governanceChannel} · {project.deliveryMethod}
                </p>
              </div>
              <Badge tone={project.rag === "Green" ? "green" : project.rag === "Amber" ? "amber" : "red"}>
                {project.rag} · {project.stage}
              </Badge>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
              {project.stageGates.map((gate) => (
                <div
                  key={gate.id}
                  className="min-w-36 rounded-xl px-3 py-3 text-xs ring-1 ring-black/5"
                  style={{
                    background:
                      gate.gateStatus === "Approved"
                        ? "color-mix(in oklab, var(--brand-primary) 16%, white)"
                        : gate.gateStatus === "In Review"
                          ? "color-mix(in oklab, var(--brand-accent) 14%, white)"
                          : "rgba(255,255,255,0.7)",
                  }}
                >
                  <p className="font-semibold text-[var(--ink)]">{gate.stage}</p>
                  <p className="mt-1 text-[var(--ink-soft)]">{gate.gateStatus}</p>
                  <p className="mt-2 text-[var(--ink-soft)]">{Math.round(gate.checklistPct)}% checklist</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {project.milestones.map((m) => (
                <div key={m.id} className="rounded-xl bg-white/70 px-3 py-3 text-sm ring-1 ring-black/5">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-[var(--ink-soft)]">
                    {m.status}
                    {m.plannedDate ? ` · ${m.plannedDate.toISOString().slice(0, 10)}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
