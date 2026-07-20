import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

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
    const email = body.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: body.password,
      options: {
        data: { name: body.name },
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Could not create Supabase Auth user" },
        { status: 400 }
      );
    }

    // If email confirmation is required, session may be null — still create workspace profile.
    const plan = await db.plan.findUnique({ where: { slug: body.planSlug } });
    const baseSlug = slugify(body.organizationName) || "workspace";
    let slug = baseSlug;
    let i = 1;
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${i++}`;
    }

    const user = await db.user.create({
      data: {
        id: authData.user.id,
        authUserId: authData.user.id,
        name: body.name,
        email,
        passwordHash: null,
      },
    });

    const org = await db.organization.create({
      data: {
        name: body.organizationName,
        slug,
        planId: plan?.id,
        billingEmail: email,
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

    if (!authData.session) {
      return NextResponse.json({
        ok: true,
        orgSlug: org.slug,
        needsEmailConfirmation: true,
        message: "Check your email to confirm your account, then sign in.",
      });
    }

    return NextResponse.json({ ok: true, orgSlug: org.slug });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
