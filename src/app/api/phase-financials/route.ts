import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";

const createSchema = z.object({
  projectId: z.string().optional().nullable(),
  projectCode: z.string().min(1),
  projectName: z.string().optional().nullable(),
  stage: z.string().min(1),
  plannedStart: z.string().optional().nullable(),
  plannedEnd: z.string().optional().nullable(),
  actualStart: z.string().optional().nullable(),
  actualEnd: z.string().optional().nullable(),
  budget: z.number().min(0).default(0),
  forecast: z.number().min(0).default(0),
  actual: z.number().min(0).default(0),
  status: z.string().default("Planned"),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.phaseFinancial.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { projectCode: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role))
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });

  const body = createSchema.parse(await req.json());
  const row = await db.phaseFinancial.create({
    data: {
      organizationId: ctx.organization.id,
      projectId: body.projectId || null,
      projectCode: body.projectCode,
      projectName: body.projectName || null,
      stage: body.stage,
      plannedStart: body.plannedStart ? new Date(body.plannedStart) : null,
      plannedEnd: body.plannedEnd ? new Date(body.plannedEnd) : null,
      actualStart: body.actualStart ? new Date(body.actualStart) : null,
      actualEnd: body.actualEnd ? new Date(body.actualEnd) : null,
      budget: body.budget,
      forecast: body.forecast,
      actual: body.actual,
      status: body.status,
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
  const existing = await db.phaseFinancial.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = await db.phaseFinancial.update({
    where: { id },
    data: {
      ...body,
      plannedStart: body.plannedStart ? new Date(body.plannedStart) : existing.plannedStart,
      plannedEnd: body.plannedEnd ? new Date(body.plannedEnd) : existing.plannedEnd,
      actualStart: body.actualStart ? new Date(body.actualStart) : existing.actualStart,
      actualEnd: body.actualEnd ? new Date(body.actualEnd) : existing.actualEnd,
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role))
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  const { id } = z.object({ id: z.string() }).parse(await req.json());
  const existing = await db.phaseFinancial.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.phaseFinancial.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
