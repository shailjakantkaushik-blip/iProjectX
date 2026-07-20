import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";

const createSchema = z.object({
  projectId: z.string().optional().nullable(),
  projectCode: z.string().min(1),
  projectName: z.string().optional().nullable(),
  fromCategory: z.string().min(1),
  toCategory: z.string().min(1),
  reason: z.string().optional().nullable(),
  changedBy: z.string().optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
  updateProject: z.boolean().optional().default(true),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.portfolioMovement.findMany({
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

  const row = await db.portfolioMovement.create({
    data: {
      organizationId: ctx.organization.id,
      projectId: body.projectId || null,
      projectCode: body.projectCode,
      projectName: body.projectName || null,
      fromCategory: body.fromCategory,
      toCategory: body.toCategory,
      reason: body.reason || null,
      changedBy: body.changedBy || ctx.user.name,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : new Date(),
    },
  });

  if (body.updateProject && body.projectId) {
    const existing = await db.project.findFirst({
      where: { id: body.projectId, organizationId: ctx.organization.id },
    });
    if (existing) {
      await db.project.update({
        where: { id: body.projectId },
        data: { portfolioCategory: body.toCategory },
      });
    }
  }

  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role))
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  const { id } = z.object({ id: z.string() }).parse(await req.json());
  const existing = await db.portfolioMovement.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.portfolioMovement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
