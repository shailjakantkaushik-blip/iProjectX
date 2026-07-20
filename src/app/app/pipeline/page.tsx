import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export default async function PipelinePage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const items = await db.pipelineItem.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { priorityScore: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Demand Pipeline"
        description="Weighted intake scoring across strategic alignment, value, risk reduction, compliance, and complexity."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, idx) => (
          <Card key={item.id} interactive className="motion-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-[var(--ink-soft)]">{item.code}</p>
                <h3 className="font-[family-name:var(--font-display)] text-xl">{item.title}</h3>
              </div>
              <Badge tone="brand">{item.priorityScore.toFixed(2)}</Badge>
            </div>
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              {item.businessUnit || "Cross-BU"} · {item.sponsor || "No sponsor"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white/70 px-2 py-2">Align {item.strategicAlignment}</div>
              <div className="rounded-lg bg-white/70 px-2 py-2">Value {item.benefitValue}</div>
              <div className="rounded-lg bg-white/70 px-2 py-2">Risk↓ {item.riskReduction}</div>
              <div className="rounded-lg bg-white/70 px-2 py-2">Complex {item.complexity}</div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge>{item.decision}</Badge>
              <span className="text-sm font-semibold">{formatCurrency(item.estBudget)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
