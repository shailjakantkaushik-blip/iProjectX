import { redirect } from "next/navigation";
import { getCurrentContext, isAdminRole } from "@/lib/auth";
import { resolveBrand } from "@/lib/branding";
import { Card, PageHeader } from "@/components/ui";
import { BrandingForm } from "@/components/settings-forms";

export default async function BrandingPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  if (!isAdminRole(ctx.membership.role)) redirect("/app/settings");

  const brand = resolveBrand(ctx.organization);

  return (
    <div>
      <PageHeader
        title="White-label branding"
        description="Customize the workspace identity your enterprise users see across the platform."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-1"
          style={{
            ["--brand-primary" as string]: brand.primaryColor,
            background: `linear-gradient(160deg, ${brand.secondaryColor}, ${brand.primaryColor})`,
            color: "white",
          }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Preview</p>
          <p className="mt-4 font-[family-name:var(--font-display)] text-3xl">{brand.brandName}</p>
          <p className="mt-2 text-sm text-white/80">{brand.loginTagline}</p>
          <div
            className="mt-6 h-16 rounded-xl"
            style={{ background: brand.accentColor, opacity: 0.85 }}
          />
        </Card>
        <div className="lg:col-span-2">
          <BrandingForm
            planSlug={ctx.organization.plan?.slug || "starter"}
            initial={{
              brandName: brand.brandName,
              primaryColor: brand.primaryColor,
              accentColor: brand.accentColor,
              secondaryColor: brand.secondaryColor,
              logoUrl: brand.logoUrl || "",
              supportEmail: brand.supportEmail || "",
              loginTagline: brand.loginTagline || "",
              customDomain: brand.customDomain || "",
              hidePoweredBy: brand.hidePoweredBy,
            }}
          />
        </div>
      </div>
    </div>
  );
}
