import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";

const schema = z.object({
  fromProjectId: z.string().optional().nullable(),
  toProjectId: z.string().optional().nullable(),
  fromName: z.string().optional(),
  toName: z.string().optional(),
  dependencyType: z.string().default("Finish-to-Start"),
  status: z.string().default("Healthy"),
  impact: z.string().default("Medium"),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.dependency.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { updatedAt: "desc" },
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
  const projects = await db.project.findMany({
    where: { organizationId: ctx.organization.id },
    select: { id: true, name: true, code: true },
  });
  const from = projects.find((p) => p.id === body.fromProjectId);
  const to = projects.find((p) => p.id === body.toProjectId);
  const fromName = body.fromName || from?.name;
  const toName = body.toName || to?.name;
  if (!fromName || !toName) {
    return NextResponse.json({ error: "From and To projects are required" }, { status: 400 });
  }
  if (fromName === toName) {
    return NextResponse.json({ error: "From and To must differ" }, { status: 400 });
  }
  const row = await db.dependency.create({
    data: {
      organizationId: ctx.organization.id,
      fromProjectId: from?.id || null,
      toProjectId: to?.id || null,
      fromName,
      toName,
      dependencyType: body.dependencyType,
      status: body.status,
      impact: body.impact,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role)) {
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  }
  const { id } = z.object({ id: z.string() }).parse(await req.json());
  const existing = await db.dependency.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.dependency.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
