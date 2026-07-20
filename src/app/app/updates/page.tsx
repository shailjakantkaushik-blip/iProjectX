import { redirect } from "next/navigation";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { filterByFy } from "@/lib/pmo/engines";
import { UpdatesClient } from "@/components/pmo/updates-client";

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { fy } = await searchParams;

  const [allProjects, updates] = await Promise.all([
    db.project.findMany({
      where: { organizationId: ctx.organization.id },
      select: { id: true, code: true, name: true, financialYear: true, rag: true },
      orderBy: { name: "asc" },
    }),
    db.update.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const projects = filterByFy(allProjects, fy);
  const projectNames = new Set(projects.map((p) => p.name));
  const filteredUpdates =
    fy && fy !== "All"
      ? updates.filter((u) => !u.projectName || projectNames.has(u.projectName))
      : updates;

  return (
    <div>
      <PageHeader
        title="Latest Updates"
        description="Capture important project updates — add, edit, or delete. Streamlit Latest Updates parity."
      />
      <UpdatesClient
        updates={filteredUpdates.map((u) => ({
          ...u,
          updateDate: u.updateDate?.toISOString() ?? null,
          createdAt: u.createdAt.toISOString(),
        }))}
        projects={projects.map((p) => ({ name: p.name, code: p.code }))}
        canEdit={canEdit(ctx.membership.role)}
      />
    </div>
  );
}
