import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const user = await db.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const membership = user.memberships[0];
    if (!membership) {
      return NextResponse.json({ error: "No organization membership found" }, { status: 403 });
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      orgId: membership.organizationId,
      orgSlug: membership.organization.slug,
      role: membership.role,
    });

    return NextResponse.json({ ok: true, orgSlug: membership.organization.slug });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
