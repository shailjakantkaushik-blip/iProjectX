import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentContext, isAdminRole } from "@/lib/auth";

const schema = z.object({
  brandName: z.string().min(1).max(80),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  logoUrl: z.string().url().optional().or(z.literal("")),
  supportEmail: z.string().email().optional().or(z.literal("")),
  loginTagline: z.string().max(160).optional(),
  customDomain: z.string().max(120).optional().or(z.literal("")),
  hidePoweredBy: z.boolean(),
});

export async function PATCH(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(ctx.membership.role)) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const planSlug = ctx.organization.plan?.slug;
  const body = schema.parse(await req.json());

  if ((body.customDomain || body.hidePoweredBy) && planSlug !== "enterprise") {
    return NextResponse.json(
      { error: "Custom domain and hide powered-by require Enterprise plan" },
      { status: 403 }
    );
  }

  if (body.logoUrl && planSlug === "starter") {
    return NextResponse.json(
      { error: "White-label logo requires Professional or Enterprise" },
      { status: 403 }
    );
  }

  const updated = await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      brandName: body.brandName,
      primaryColor: body.primaryColor,
      accentColor: body.accentColor,
      secondaryColor: body.secondaryColor,
      logoUrl: body.logoUrl || null,
      supportEmail: body.supportEmail || null,
      loginTagline: body.loginTagline || null,
      customDomain: body.customDomain || null,
      hidePoweredBy: body.hidePoweredBy,
    },
  });

  return NextResponse.json({ ok: true, organization: updated });
}
