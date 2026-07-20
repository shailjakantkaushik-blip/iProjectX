import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
  planSlug: z.enum(["starter", "professional", "enterprise"]).default("starter"),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const existing = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const plan = await db.plan.findUnique({ where: { slug: body.planSlug } });
    const baseSlug = slugify(body.organizationName) || "workspace";
    let slug = baseSlug;
    let i = 1;
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${i++}`;
    }

    const passwordHash = await hashPassword(body.password);
    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash,
      },
    });

    const org = await db.organization.create({
      data: {
        name: body.organizationName,
        slug,
        planId: plan?.id,
        billingEmail: body.email.toLowerCase(),
        seatCount: 1,
        subscriptionStatus: "trialing",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        brandName: body.organizationName,
        loginTagline: "Enterprise project management & delivery intelligence",
      },
    });

    await db.membership.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "owner",
      },
    });

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      orgId: org.id,
      orgSlug: org.slug,
      role: "owner",
    });

    return NextResponse.json({ ok: true, orgSlug: org.slug });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
