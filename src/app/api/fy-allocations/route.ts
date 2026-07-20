import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";

const createSchema = z.object({
  projectId: z.string().optional().nullable(),
  projectCode: z.string().min(1),
  projectName: z.string().optional().nullable(),
  fy: z.string().min(1),
  budgetPct: z.number().min(0).max(100).default(0),
  forecastPct: z.number().min(0).max(100).default(0),
  budgetAmount: z.number().min(0).default(0),
  forecastAmount: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.fyAllocation.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: [{ fy: "asc" }, { projectCode: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role))
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });

  const body = createSchema.parse(await req.json());
  const row = await db.fyAllocation.upsert({
    where: {
      organizationId_projectCode_fy: {
        organizationId: ctx.organization.id,
        projectCode: body.projectCode,
        fy: body.fy,
      },
    },
    create: {
      organizationId: ctx.organization.id,
      projectId: body.projectId || null,
      projectCode: body.projectCode,
      projectName: body.projectName || null,
      fy: body.fy,
      budgetPct: body.budgetPct,
      forecastPct: body.forecastPct,
      budgetAmount: body.budgetAmount,
      forecastAmount: body.forecastAmount,
      notes: body.notes || null,
    },
    update: {
      budgetPct: body.budgetPct,
      forecastPct: body.forecastPct,
      budgetAmount: body.budgetAmount,
      forecastAmount: body.forecastAmount,
      notes: body.notes || null,
      projectName: body.projectName || null,
    },
  });
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role))
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  const { id } = z.object({ id: z.string() }).parse(await req.json());
  const existing = await db.fyAllocation.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.fyAllocation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
