import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";

const createSchema = z.object({
  projectId: z.string().optional().nullable(),
  projectCode: z.string().optional().nullable(),
  projectName: z.string().optional().nullable(),
  title: z.string().min(1),
  benefitType: z.string().default("Financial"),
  targetValue: z.number().min(0).default(0),
  realisedValue: z.number().min(0).default(0),
  owner: z.string().optional().nullable(),
  status: z.string().default("Tracked"),
  fy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.benefit.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role))
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });

  const body = createSchema.parse(await req.json());
  const row = await db.benefit.create({
    data: {
      organizationId: ctx.organization.id,
      projectId: body.projectId || null,
      projectCode: body.projectCode || null,
      projectName: body.projectName || null,
      title: body.title,
      benefitType: body.benefitType,
      targetValue: body.targetValue,
      realisedValue: body.realisedValue,
      owner: body.owner || null,
      status: body.status,
      fy: body.fy || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role))
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  const raw = await req.json();
  const id = z.string().parse(raw.id);
  const body = createSchema.partial().parse(raw);
  const existing = await db.benefit.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = await db.benefit.update({ where: { id }, data: body });
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role))
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  const { id } = z.object({ id: z.string() }).parse(await req.json());
  const existing = await db.benefit.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.benefit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
