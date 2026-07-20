import { redirect } from "next/navigation";
import { getCurrentContext } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { PageHeader } from "@/components/ui";
import { PlatformAdminForm } from "@/components/platform-admin-form";

export default async function PlatformAdminPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  if (!ctx.user.isPlatformAdmin) redirect("/app");

  const site = await getSiteConfig();

  return (
    <div>
      <PageHeader
        title="Platform Admin"
        description="App-owner controls for landing page content, brand colors, and global feature availability."
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
  );
}
