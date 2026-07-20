import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { filterByFy } from "@/lib/pmo/engines";
import { formatPct } from "@/lib/utils";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { fy } = await searchParams;

  const projects = filterByFy(
    await db.project.findMany({
      where: { organizationId: ctx.organization.id },
      include: { milestones: true, stageGates: true },
      orderBy: { startDate: "asc" },
    }),
    fy
  );

  const dated = projects.filter((p) => p.startDate && p.endDate);
  const min = dated.length
    ? Math.min(...dated.map((p) => new Date(p.startDate!).getTime()))
    : Date.now();
  const max = dated.length
    ? Math.max(...dated.map((p) => new Date(p.endDate!).getTime()))
    : Date.now() + 1;
  const span = Math.max(1, max - min);

  return (
    <div>
      <PageHeader
        title="Portfolio Timeline"
        description="Planned project timelines with progress — Streamlit Timeline parity."
      />
      <Card>
        <div className="space-y-4">
          {dated.map((p) => {
            const start = new Date(p.startDate!).getTime();
            const end = new Date(p.endDate!).getTime();
            const left = ((start - min) / span) * 100;
            const width = Math.max(2, ((end - start) / span) * 100);
            return (
              <div key={p.id}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-semibold">{p.code}</span>{" "}
                    <span className="text-[var(--ink-soft)]">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={p.rag === "Green" ? "green" : p.rag === "Amber" ? "amber" : "red"}>
                      {p.rag}
                    </Badge>
                    <span className="text-xs text-[var(--ink-soft)]">{formatPct(p.progress)}</span>
                  </div>
                </div>
                <div className="relative h-8 rounded-lg bg-black/[0.04]">
                  <div
                    className="absolute top-1 h-6 rounded-md"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      background:
                        p.rag === "Red" ? "#e11d48" : p.rag === "Amber" ? "#d97706" : "#0f766e",
                      opacity: 0.85,
                    }}
                    title={`${p.startDate?.toDateString()} → ${p.endDate?.toDateString()}`}
                  />
                </div>
              </div>
            );
          })}
          {!dated.length ? (
            <p className="text-sm text-[var(--ink-soft)]">
              No projects with start/end dates. Import Excel or seed sample data.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
