import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";

const createSchema = z.object({
  projectId: z.string().optional().nullable(),
  projectCode: z.string().optional().nullable(),
  projectName: z.string().optional().nullable(),
  year: z.number().int().min(2000).max(2100),
  capex: z.number().min(0).default(0),
  opex: z.number().min(0).default(0),
  benefitRecurring: z.number().min(0).default(0),
  benefitOneOff: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.costBenefitYear.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: [{ year: "asc" }, { projectCode: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role))
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });

  const body = createSchema.parse(await req.json());
  const row = await db.costBenefitYear.upsert({
    where: {
      organizationId_projectCode_year: {
        organizationId: ctx.organization.id,
        projectCode: body.projectCode || "PORTFOLIO",
        year: body.year,
      },
    },
    create: {
      organizationId: ctx.organization.id,
      projectId: body.projectId || null,
      projectCode: body.projectCode || "PORTFOLIO",
      projectName: body.projectName || null,
      year: body.year,
      capex: body.capex,
      opex: body.opex,
      benefitRecurring: body.benefitRecurring,
      benefitOneOff: body.benefitOneOff,
      notes: body.notes || null,
    },
    update: {
      capex: body.capex,
      opex: body.opex,
      benefitRecurring: body.benefitRecurring,
      benefitOneOff: body.benefitOneOff,
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
  const existing = await db.costBenefitYear.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.costBenefitYear.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
