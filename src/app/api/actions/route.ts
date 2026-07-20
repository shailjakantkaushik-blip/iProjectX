import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";

const schema = z.object({
  title: z.string().min(2),
  projectId: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.string().default("Medium"),
  status: z.string().default("Open"),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.action.findMany({
    where: { organizationId: ctx.organization.id },
    include: { project: { select: { id: true, code: true, name: true } } },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role)) {
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  }
  const body = schema.parse(await req.json());
  const row = await db.action.create({
    data: {
      organizationId: ctx.organization.id,
      title: body.title,
      projectId: body.projectId || null,
      owner: body.owner || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      priority: body.priority,
      status: body.status,
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
  const existing = await db.action.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = await db.action.update({
    where: { id },
    data: {
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate === null ? null : undefined,
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
  const existing = await db.action.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.action.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
