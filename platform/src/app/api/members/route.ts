import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getCurrentContext, isAdminRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const email = body.email.toLowerCase();
  const memberCount = await db.membership.count({
    where: { organizationId: ctx.organization.id },
  });
  if (memberCount >= ctx.organization.seatCount) {
    return NextResponse.json(
      { error: "Seat limit reached. Increase seats in Billing." },
      { status: 403 }
    );
  }

  let user = await db.user.findUnique({ where: { email } });
  let tempPassword: string | null = null;

  if (!user) {
    const admin = createAdminClient();
    tempPassword = `Welcome-${randomBytes(4).toString("hex")}`;

    if (admin) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: body.name },
      });
      if (error || !data.user) {
        return NextResponse.json(
          { error: error?.message || "Could not create Supabase Auth user" },
          { status: 400 }
        );
      }
      user = await db.user.create({
        data: {
          id: data.user.id,
          authUserId: data.user.id,
          email,
          name: body.name,
          passwordHash: null,
        },
      });
    } else {
      // No service role: create app profile only; user must sign up with same email later.
      user = await db.user.create({
        data: {
          email,
          name: body.name,
          passwordHash: null,
        },
      });
      tempPassword = null;
    }
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
      email,
      role: body.role,
      token: randomBytes(16).toString("hex"),
      invitedById: ctx.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(),
    },
  });

  return NextResponse.json(
    {
      ...membership,
      temporaryPassword: tempPassword,
      note: tempPassword
        ? "Share the temporary password securely. User should change it after first login."
        : "Profile created. User should sign up with this email to link Supabase Auth.",
    },
    { status: 201 }
  );
}
