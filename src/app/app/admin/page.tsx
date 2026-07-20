import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { db } from "@/lib/db";
import { isStripeConfigured } from "@/lib/stripe";
import { PageHeader } from "@/components/ui";
import { PlatformAdminForm } from "@/components/platform-admin-form";
import { AdminInvoicePanel } from "@/components/invoice-billing";

export default async function PlatformAdminPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  if (!ctx.user.isPlatformAdmin) redirect("/app");

  const [site, organizations, plans, invoices] = await Promise.all([
    getSiteConfig(),
    db.organization.findMany({
      include: {
        plan: { select: { slug: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    db.invoice.findMany({
      include: {
        organization: {
          select: { id: true, name: true, slug: true, billingEmail: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <PageHeader
          title="Platform Admin"
          description="Bill enterprise customers, then configure the public landing experience."
        />
        <AdminInvoicePanel
          stripeConfigured={isStripeConfigured()}
          organizations={organizations.map((o) => ({
            id: o.id,
            name: o.name,
            slug: o.slug,
            billingEmail: o.billingEmail,
            seatCount: o.seatCount,
            subscriptionStatus: o.subscriptionStatus,
            plan: o.plan,
          }))}
          plans={plans.map((p) => ({
            slug: p.slug,
            name: p.name,
            monthlyPrice: p.monthlyPrice,
            annualPrice: p.annualPrice,
            seatLimit: p.seatLimit,
          }))}
          invoices={invoices}
        />
      </div>

      <div>
        <PageHeader
          title="Site configuration"
          description="Landing page content, brand colors, and global feature availability."
        />
        <PlatformAdminForm
          initial={{
            brandName: site.brandName,
            heroTitle: site.heroTitle,
            heroSubtitle: site.heroSubtitle,
            heroCtaLabel: site.heroCtaLabel,
            heroCtaHref: site.heroCtaHref,
            secondaryCtaLabel: site.secondaryCtaLabel,
            secondaryCtaHref: site.secondaryCtaHref,
            primaryColor: site.primaryColor,
            accentColor: site.accentColor,
            secondaryColor: site.secondaryColor,
            logoUrl: site.logoUrl || "",
            supportEmail: site.supportEmail || "",
            footerText: site.footerText,
            showPricing: site.showPricing,
            showSignup: site.showSignup,
            enableExcelImport: site.enableExcelImport,
            enablePptExport: site.enablePptExport,
            enablePdfExport: site.enablePdfExport,
            featureCardsJson: JSON.stringify(site.featureCards, null, 2),
          }}
        />
      </div>
    </div>
  );
}
