import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { weightedPriorityScore } from "@/lib/pmo/analytics";

const createSchema = z.object({
  projectId: z.string().optional().nullable(),
  projectCode: z.string().min(1),
  projectName: z.string().optional().nullable(),
  strategicAlignment: z.number().int().min(1).max(5).default(3),
  benefitValue: z.number().int().min(1).max(5).default(3),
  riskReduction: z.number().int().min(1).max(5).default(2),
  compliance: z.number().int().min(1).max(5).default(2),
  complexity: z.number().int().min(1).max(5).default(3),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.prioritisationScore.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { score: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role))
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });

  const body = createSchema.parse(await req.json());
  const score = weightedPriorityScore({
    strategicAlignment: body.strategicAlignment,
    benefitValue: body.benefitValue,
    riskReduction: body.riskReduction,
    compliance: body.compliance,
    complexity: body.complexity,
  });

  const row = await db.prioritisationScore.upsert({
    where: {
      organizationId_projectCode: {
        organizationId: ctx.organization.id,
        projectCode: body.projectCode,
      },
    },
    create: {
      organizationId: ctx.organization.id,
      projectId: body.projectId || null,
      projectCode: body.projectCode,
      projectName: body.projectName || null,
      strategicAlignment: body.strategicAlignment,
      benefitValue: body.benefitValue,
      riskReduction: body.riskReduction,
      compliance: body.compliance,
      complexity: body.complexity,
      score,
      notes: body.notes || null,
    },
    update: {
      strategicAlignment: body.strategicAlignment,
      benefitValue: body.benefitValue,
      riskReduction: body.riskReduction,
      compliance: body.compliance,
      complexity: body.complexity,
      score,
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
  const existing = await db.prioritisationScore.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.prioritisationScore.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
