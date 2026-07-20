import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { resolveBrand } from "@/lib/branding";
import { AppShell } from "@/components/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const brand = resolveBrand(ctx.organization);

  return (
    <AppShell
      brand={brand}
      userName={ctx.user.name}
      role={ctx.membership.role}
      planName={ctx.organization.plan?.name || "Trial"}
    >
      {children}
    </AppShell>
  );
}
