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

    // Keep the query narrow — older DBs may be missing optional org columns.
    let user = await db.user.findFirst({
      where: {
        OR: [{ authUserId: data.user.id }, { id: data.user.id }, { email }],
      },
      select: {
        id: true,
        email: true,
        authUserId: true,
        isPlatformAdmin: true,
        memberships: {
          select: {
            id: true,
            role: true,
            organization: {
              select: { id: true, slug: true, name: true },
            },
          },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    if (!user) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "Signed in to Supabase Auth, but no app User profile exists. Run the admin setup SQL for this email.",
        },
        { status: 403 }
      );
    }

    if (!user.authUserId) {
      await db.user.update({
        where: { id: user.id },
        data: { authUserId: data.user.id },
      });
      user = { ...user, authUserId: data.user.id };
    }

    const membership = user.memberships[0];
    if (!membership) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "No organization membership found for this user. Attach them to an Organization in SQL.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, orgSlug: membership.organization.slug });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Login error:", e);
    const message = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json(
      {
        error: message.includes("Missing NEXT_PUBLIC_SUPABASE")
          ? "Supabase Auth is not configured"
          : `Login failed: ${message}`,
      },
      { status: 500 }
    );
  }
}
