import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentContext, isAdminRole } from "@/lib/auth";

const schema = z.object({
  planSlug: z.enum(["starter", "professional", "enterprise"]),
  seatCount: z.number().int().min(1).max(500),
});

export async function PATCH(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(ctx.membership.role)) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const plan = await db.plan.findUnique({ where: { slug: body.planSlug } });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  if (body.seatCount > plan.seatLimit) {
    return NextResponse.json(
      { error: `Seat count exceeds ${plan.name} limit of ${plan.seatLimit}` },
      { status: 400 }
    );
  }

  const memberCount = await db.membership.count({
    where: { organizationId: ctx.organization.id },
  });
  if (body.seatCount < memberCount) {
    return NextResponse.json(
      { error: `Seat count cannot be below current members (${memberCount})` },
      { status: 400 }
    );
  }

  const updated = await db.organization.update({
    where: { id: ctx.organization.id },
    data: {
      planId: plan.id,
      seatCount: body.seatCount,
      subscriptionStatus: "active",
    },
    include: { plan: true },
  });

  return NextResponse.json({
    ok: true,
    organization: {
      ...updated,
      plan: updated.plan
        ? { ...updated.plan, features: JSON.parse(updated.plan.features || "[]") }
        : null,
    },
  });
}
