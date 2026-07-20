import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/auth";

const schema = z.object({
  brandName: z.string().min(1).max(80),
  heroTitle: z.string().min(1).max(200),
  heroSubtitle: z.string().min(1).max(500),
  heroCtaLabel: z.string().min(1).max(60),
  heroCtaHref: z.string().min(1).max(120),
  secondaryCtaLabel: z.string().min(1).max(60),
  secondaryCtaHref: z.string().min(1).max(120),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  logoUrl: z.string().optional().or(z.literal("")),
  supportEmail: z.string().optional().or(z.literal("")),
  footerText: z.string().min(1).max(200),
  showPricing: z.boolean(),
  showSignup: z.boolean(),
  enableExcelImport: z.boolean(),
  enablePptExport: z.boolean(),
  enablePdfExport: z.boolean(),
  featureCardsJson: z.string().min(2),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx?.user.isPlatformAdmin) {
    return NextResponse.json({ error: "Platform admin required" }, { status: 403 });
  }
  const config = await db.siteConfig.findUnique({ where: { id: "default" } });
  return NextResponse.json(config);
}

export async function PATCH(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx?.user.isPlatformAdmin) {
    return NextResponse.json({ error: "Platform admin required" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  try {
    JSON.parse(body.featureCardsJson);
  } catch {
    return NextResponse.json({ error: "featureCardsJson must be valid JSON" }, { status: 400 });
  }

  const updated = await db.siteConfig.upsert({
    where: { id: "default" },
    update: {
      ...body,
      logoUrl: body.logoUrl || null,
      supportEmail: body.supportEmail || null,
    },
    create: {
      id: "default",
      ...body,
      logoUrl: body.logoUrl || null,
      supportEmail: body.supportEmail || null,
    },
  });

  return NextResponse.json({ ok: true, config: updated });
}
