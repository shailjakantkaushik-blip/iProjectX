import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/auth";
import { createAndSendInvoice } from "@/lib/billing";
import { isStripeConfigured } from "@/lib/stripe";

const createSchema = z.object({
  organizationId: z.string().min(1),
  planSlug: z.enum(["starter", "professional", "enterprise"]),
  seatCount: z.number().int().min(1).max(500),
  interval: z.enum(["month", "year"]).default("year"),
  customAmountCents: z.number().int().min(50).optional(),
  daysUntilDue: z.number().int().min(1).max(90).optional(),
  description: z.string().max(500).optional(),
  billingEmail: z.string().email().optional(),
  send: z.boolean().optional(),
});

export async function GET(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx?.user.isPlatformAdmin) {
    return NextResponse.json({ error: "Platform admin required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId") || undefined;

  const invoices = await db.invoice.findMany({
    where: organizationId ? { organizationId } : undefined,
    include: {
      organization: { select: { id: true, name: true, slug: true, billingEmail: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    ok: true,
    stripeConfigured: isStripeConfigured(),
    invoices,
  });
}

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx?.user.isPlatformAdmin) {
    return NextResponse.json({ error: "Platform admin required" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid body" }, { status: 400 });
  }

  try {
    const result = await createAndSendInvoice({
      ...parsed.data,
      createdByUserId: ctx.user.id,
    });
    return NextResponse.json({ ok: true, invoice: result.invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create invoice";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
