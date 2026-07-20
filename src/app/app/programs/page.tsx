import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export default async function ProgramsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const programs = await db.program.findMany({
    where: { organizationId: ctx.organization.id },
    include: { projects: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Programs"
        description="Roll up project delivery, funding, and forecast pressure by strategic program."
      />
      <div className="grid gap-5 lg:grid-cols-3">
        {programs.map((program) => {
          const funding = program.projects.reduce((s, p) => s + p.funding, 0);
          const red = program.projects.filter((p) => p.rag === "Red").length;
          return (
            <Card key={program.id} interactive>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-[family-name:var(--font-display)] text-2xl">{program.name}</h3>
                <Badge tone={program.status === "Active" ? "green" : "neutral"}>{program.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                Owner {program.owner || "—"} · Sponsor {program.sponsor || "—"}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Budget</p>
                  <p className="kpi-value text-xl">{formatCurrency(program.budget)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Forecast</p>
                  <p className="kpi-value text-xl">{formatCurrency(program.forecast)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Projects</p>
                  <p className="kpi-value text-xl">{program.projects.length}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Critical</p>
                  <p className="kpi-value text-xl">{red}</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-[var(--ink-soft)]">
                Linked funding {formatCurrency(funding)}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
