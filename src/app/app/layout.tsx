import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { resolveBrand } from "@/lib/branding";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const brand = resolveBrand(ctx.organization);
  const projects = await db.project.findMany({
    where: { organizationId: ctx.organization.id },
    select: { financialYear: true },
  });
  const fyOptions = [
    ...new Set(projects.map((p) => p.financialYear).filter(Boolean) as string[]),
  ].sort();

  return (
    <Suspense fallback={<div className="p-8 text-sm text-[var(--ink-soft)]">Loading workspace…</div>}>
      <AppShell
        brand={brand}
        userName={ctx.user.name}
        role={ctx.membership.role}
        planName={ctx.organization.plan?.name || "Trial"}
        isPlatformAdmin={ctx.user.isPlatformAdmin}
        fyOptions={fyOptions}
      >
        {children}
      </AppShell>
    </Suspense>
  );
}
