import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentContext, isAdminRole } from "@/lib/auth";
import { createAndSendInvoice } from "@/lib/billing";
import { isStripeConfigured } from "@/lib/stripe";

const createSchema = z.object({
  planSlug: z.enum(["starter", "professional", "enterprise"]),
  seatCount: z.number().int().min(1).max(500),
  interval: z.enum(["month", "year"]).default("year"),
  billingEmail: z.string().email().optional(),
  description: z.string().max(500).optional(),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(ctx.membership.role)) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const invoices = await db.invoice.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    stripeConfigured: isStripeConfigured(),
    billingEmail: ctx.organization.billingEmail,
    invoices,
  });
}

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(ctx.membership.role)) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid body" }, { status: 400 });
  }

  try {
    const result = await createAndSendInvoice({
      organizationId: ctx.organization.id,
      ...parsed.data,
      createdByUserId: ctx.user.id,
      send: true,
    });
    return NextResponse.json({ ok: true, invoice: result.invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create invoice";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
