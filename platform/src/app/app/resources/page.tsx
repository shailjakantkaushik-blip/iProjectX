import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";

export default async function ResourcesPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const resources = await db.resource.findMany({
    where: { organizationId: ctx.organization.id },
    include: { project: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Resources"
        description="Capacity vs allocation heat for delivery teams across the active portfolio."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {resources.map((r) => {
          const over = r.allocationPct > r.capacityPct;
          const util = Math.min(140, (r.allocationPct / Math.max(1, r.capacityPct)) * 100);
          return (
            <Card key={r.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-xl">{r.name}</h3>
                  <p className="text-sm text-[var(--ink-soft)]">
                    {r.role || "Contributor"} · {r.skill || "General"}
                  </p>
                </div>
                <Badge tone={over ? "red" : "green"}>{over ? "Overallocated" : "Healthy"}</Badge>
              </div>
              <p className="mt-3 text-sm text-[var(--ink-soft)]">
                {r.project?.name || "Unassigned"} · {r.month || "Current"}
              </p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-[var(--ink-soft)]">
                  <span>Allocation {r.allocationPct}%</span>
                  <span>Capacity {r.capacityPct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-black/5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${util}%`,
                      background: over ? "var(--rag-red)" : "var(--brand-primary)",
                    }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
