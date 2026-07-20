import type { Organization } from "@prisma/client";

export type BrandTheme = {
  brandName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  supportEmail: string | null;
  loginTagline: string | null;
  hidePoweredBy: boolean;
  customDomain: string | null;
};

export function resolveBrand(org?: Organization | null): BrandTheme {
  return {
    brandName: org?.brandName || org?.name || process.env.NEXT_PUBLIC_APP_NAME || "iProjectX",
    logoUrl: org?.logoUrl ?? null,
    faviconUrl: org?.faviconUrl ?? null,
    primaryColor: org?.primaryColor || "#0F766E",
    accentColor: org?.accentColor || "#0EA5E9",
    secondaryColor: org?.secondaryColor || "#134E4A",
    supportEmail: org?.supportEmail ?? null,
    loginTagline:
      org?.loginTagline ||
      "Enterprise project management & delivery intelligence",
    hidePoweredBy: org?.hidePoweredBy ?? false,
    customDomain: org?.customDomain ?? null,
  };
}

export function brandCssVars(brand: BrandTheme): Record<string, string> {
  return {
    "--brand-primary": brand.primaryColor,
    "--brand-accent": brand.accentColor,
    "--brand-secondary": brand.secondaryColor,
  };
}
