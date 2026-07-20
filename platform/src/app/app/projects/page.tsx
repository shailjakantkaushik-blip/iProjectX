import { redirect } from "next/navigation";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ProjectsClient } from "@/components/projects-client";

export default async function ProjectsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const [projects, programs] = await Promise.all([
    db.project.findMany({
      where: { organizationId: ctx.organization.id },
      include: { program: true },
      orderBy: { code: "asc" },
    }),
    db.program.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Portfolio register with live RAG, stage, funding, and delivery method controls."
      />
      <ProjectsClient
        projects={projects}
        programs={programs.map((p) => ({ id: p.id, name: p.name }))}
        canEdit={canEdit(ctx.membership.role)}
      />
    </div>
  );
}
