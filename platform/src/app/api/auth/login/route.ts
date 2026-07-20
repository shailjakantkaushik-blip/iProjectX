import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase();
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: body.password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Invalid email or password" },
        { status: 401 }
      );
    }

    let user = await db.user.findFirst({
      where: {
        OR: [{ authUserId: data.user.id }, { id: data.user.id }, { email }],
      },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    if (!user) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Signed in to Supabase, but no workspace profile exists. Contact your admin." },
        { status: 403 }
      );
    }

    if (!user.authUserId) {
      user = await db.user.update({
        where: { id: user.id },
        data: { authUserId: data.user.id },
        include: {
          memberships: {
            include: { organization: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      });
    }

    const membership = user.memberships[0];
    if (!membership) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "No organization membership found" }, { status: 403 });
    }

    return NextResponse.json({ ok: true, orgSlug: membership.organization.slug });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message.includes("Missing NEXT_PUBLIC_SUPABASE")
            ? "Supabase Auth is not configured"
            : "Login failed",
      },
      { status: 500 }
    );
  }
}
