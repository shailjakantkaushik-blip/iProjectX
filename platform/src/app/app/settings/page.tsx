import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentContext, isAdminRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { BillingForm, MembersForm } from "@/components/settings-forms";
import { priceLabel } from "@/lib/plans";

export default async function SettingsPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const [plans, members, projectCount] = await Promise.all([
    db.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    db.membership.findMany({
      where: { organizationId: ctx.organization.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    db.project.count({ where: { organizationId: ctx.organization.id } }),
  ]);

  const plan = ctx.organization.plan;
  const admin = isAdminRole(ctx.membership.role);

  return (
    <div>
      <PageHeader
        title="Workspace Settings"
        description="Manage subscription seats, team access, and white-label enterprise branding."
        action={
          <Link
            href="/app/settings/branding"
            className="rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Open branding
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Plan</p>
          <p className="kpi-value mt-2 text-2xl">{plan?.name || "Trial"}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Status</p>
          <p className="mt-2">
            <Badge tone="green">{ctx.organization.subscriptionStatus}</Badge>
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Seats</p>
          <p className="kpi-value mt-2 text-2xl">
            {members.length}/{ctx.organization.seatCount}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-[var(--ink-soft)]">Projects</p>
          <p className="kpi-value mt-2 text-2xl">
            {projectCount}/{plan?.projectLimit ?? "—"}
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {admin ? (
          <BillingForm
            plans={plans}
            currentPlanSlug={plan?.slug || "starter"}
            seatCount={ctx.organization.seatCount}
            memberCount={members.length}
          />
        ) : (
          <Card>
            <h3 className="font-[family-name:var(--font-display)] text-xl">Subscription</h3>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              {plan?.name} · {plan ? priceLabel(plan.monthlyPrice) : "—"}/mo. Contact an admin to change plans.
            </p>
          </Card>
        )}

        <MembersForm canManage={admin} />
      </div>

      <Card className="mt-6">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Members</h3>
        <div className="table-wrap mt-4">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium">{m.user.name}</td>
                  <td>{m.user.email}</td>
                  <td>
                    <Badge>{m.role}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
