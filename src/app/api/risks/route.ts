import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";

function ragFromScore(score: number) {
  if (score >= 36) return "Red";
  if (score >= 18) return "Amber";
  return "Green";
}

const createSchema = z.object({
  code: z.string().min(2),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  probability: z.number().int().min(1).max(5).default(3),
  impact: z.number().int().min(1).max(5).default(3),
  velocity: z.number().int().min(1).max(5).default(2),
  owner: z.string().optional().nullable(),
  mitigation: z.string().optional().nullable(),
  status: z.string().default("Open"),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const risks = await db.risk.findMany({
    where: { organizationId: ctx.organization.id },
    include: { project: { select: { id: true, code: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(risks);
}

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role)) {
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  }
  const body = createSchema.parse(await req.json());
  const score = body.probability * body.impact * body.velocity;
  const risk = await db.risk.create({
    data: {
      organizationId: ctx.organization.id,
      code: body.code,
      title: body.title,
      description: body.description || null,
      projectId: body.projectId || null,
      probability: body.probability,
      impact: body.impact,
      velocity: body.velocity,
      owner: body.owner || null,
      mitigation: body.mitigation || null,
      status: body.status,
      rag: ragFromScore(score),
    },
  });
  return NextResponse.json(risk, { status: 201 });
}

export async function PATCH(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role)) {
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  }
  const raw = await req.json();
  const id = z.string().parse(raw.id);
  const body = createSchema.partial().parse(raw);
  const existing = await db.risk.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const probability = body.probability ?? existing.probability;
  const impact = body.impact ?? existing.impact;
  const velocity = body.velocity ?? existing.velocity;
  const risk = await db.risk.update({
    where: { id },
    data: {
      ...body,
      rag: ragFromScore(probability * impact * velocity),
    },
  });
  return NextResponse.json(risk);
}

export async function DELETE(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role)) {
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  }
  const { id } = z.object({ id: z.string() }).parse(await req.json());
  const existing = await db.risk.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.risk.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
