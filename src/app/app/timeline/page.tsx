import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader, Badge } from "@/components/ui";
import { filterByFy } from "@/lib/pmo/engines";
import { TimelineClient } from "@/components/pmo/timeline-client";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { fy } = await searchParams;

  const allProjects = await db.project.findMany({
    where: { organizationId: ctx.organization.id },
    select: {
      id: true,
      code: true,
      name: true,
      startDate: true,
      endDate: true,
      rag: true,
      progress: true,
      financialYear: true,
      portfolioCategory: true,
      theme: true,
      businessUnit: true,
      programId: true,
      priority: true,
      governanceChannel: true,
    },
    orderBy: { startDate: "asc" },
  });

  const projects = filterByFy(allProjects, fy);

  const programs = await db.program.findMany({
    where: { organizationId: ctx.organization.id },
    select: { id: true, name: true },
  });
  const programMap = new Map(programs.map((p) => [p.id, p.name]));

  const projectRows = projects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    endDate: p.endDate ? p.endDate.toISOString() : null,
    rag: p.rag,
    progress: p.progress,
    portfolioCategory: p.portfolioCategory,
    theme: p.theme,
    businessUnit: p.businessUnit,
    program: p.programId ? programMap.get(p.programId) || null : null,
    priority: p.priority,
    governanceChannel: p.governanceChannel,
  }));

  const dated = projectRows.filter((p) => p.startDate && p.endDate);
  const ragCounts = { Green: 0, Amber: 0, Red: 0 };
  for (const p of projects) {
    if (p.rag === "Green") ragCounts.Green++;
    else if (p.rag === "Amber") ragCounts.Amber++;
    else ragCounts.Red++;
  }

  return (
    <div>
      <PageHeader
        title="Portfolio Timeline"
        description="Interactive Gantt with group-by selector — Streamlit Timeline parity."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Total projects</p>
          <p className="kpi-value mt-2 text-3xl">{projects.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">With dates</p>
          <p className="kpi-value mt-2 text-3xl">{dated.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">RAG Green</p>
          <p className="kpi-value mt-2 text-3xl text-emerald-700">{ragCounts.Green}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">At risk</p>
              <p className="kpi-value mt-2 text-3xl text-amber-600">{ragCounts.Amber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Red</p>
              <p className="mt-2 text-3xl font-semibold text-rose-700">{ragCounts.Red}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <TimelineClient projects={projectRows} />
      </Card>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Projects without dates</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>RAG</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {projects
                .filter((p) => !p.startDate || !p.endDate)
                .map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.code}</td>
                    <td>{p.name}</td>
                    <td>{p.portfolioCategory || "—"}</td>
                    <td>
                      <Badge
                        tone={
                          p.rag === "Green" ? "green" : p.rag === "Amber" ? "amber" : "red"
                        }
                      >
                        {p.rag}
                      </Badge>
                    </td>
                    <td>{p.progress}%</td>
                  </tr>
                ))}
              {!projects.filter((p) => !p.startDate || !p.endDate).length && (
                <tr>
                  <td colSpan={5} className="text-[var(--ink-soft)]">
                    All projects have start and end dates.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
