import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentContext, hashPassword, isAdminRole } from "@/lib/auth";
import { randomBytes } from "crypto";

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await db.membership.findMany({
    where: { organizationId: ctx.organization.id },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(members);
}

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["admin", "executive", "bu_lead", "pm"]),
});

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(ctx.membership.role)) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const body = inviteSchema.parse(await req.json());
  const memberCount = await db.membership.count({
    where: { organizationId: ctx.organization.id },
  });
  if (memberCount >= ctx.organization.seatCount) {
    return NextResponse.json(
      { error: "Seat limit reached. Increase seats in Billing." },
      { status: 403 }
    );
  }

  let user = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user) {
    const temp = randomBytes(4).toString("hex");
    user = await db.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        passwordHash: await hashPassword(`Welcome-${temp}`),
      },
    });
  }

  const membership = await db.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: ctx.organization.id,
        userId: user.id,
      },
    },
    update: { role: body.role },
    create: {
      organizationId: ctx.organization.id,
      userId: user.id,
      role: body.role,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  await db.invitation.create({
    data: {
      organizationId: ctx.organization.id,
      email: body.email.toLowerCase(),
      role: body.role,
      token: randomBytes(16).toString("hex"),
      invitedById: ctx.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(),
    },
  });

  return NextResponse.json(membership, { status: 201 });
}
