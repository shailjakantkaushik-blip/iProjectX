import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";

const schema = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  decidedOn: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  status: z.string().default("Pending"),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.decision.findMany({
    where: { organizationId: ctx.organization.id },
    include: { project: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: "desc" },
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
  const row = await db.decision.create({
    data: {
      organizationId: ctx.organization.id,
      title: body.title,
      description: body.description || null,
      projectId: body.projectId || null,
      owner: body.owner || null,
      decidedOn: body.decidedOn ? new Date(body.decidedOn) : null,
      outcome: body.outcome || null,
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
  const existing = await db.decision.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = await db.decision.update({
    where: { id },
    data: {
      ...body,
      decidedOn: body.decidedOn ? new Date(body.decidedOn) : body.decidedOn === null ? null : undefined,
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
  const existing = await db.decision.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.decision.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
