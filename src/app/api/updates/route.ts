import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";

const schema = z.object({
  title: z.string().min(2),
  body: z.string().min(1),
  category: z.string().default("General"),
  projectName: z.string().optional().nullable(),
  impact: z.string().default("Medium"),
  author: z.string().optional().nullable(),
  updateDate: z.string().optional().nullable(),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const updates = await db.update.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(updates);
}

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role)) {
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  }
  const body = schema.parse(await req.json());
  const row = await db.update.create({
    data: {
      organizationId: ctx.organization.id,
      title: body.title,
      body: body.body,
      category: body.category,
      projectName: body.projectName || null,
      impact: body.impact,
      author: body.author || ctx.user.name,
      updateDate: body.updateDate ? new Date(body.updateDate) : new Date(),
    },
  });
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role)) {
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  }
  const raw = await req.json();
  const id = z.string().parse(raw.id);
  const body = schema.partial().parse(raw);
  const existing = await db.update.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = await db.update.update({
    where: { id },
    data: {
      ...body,
      updateDate: body.updateDate ? new Date(body.updateDate) : undefined,
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role)) {
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  }
  const { id } = z.object({ id: z.string() }).parse(await req.json());
  const existing = await db.update.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.update.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
