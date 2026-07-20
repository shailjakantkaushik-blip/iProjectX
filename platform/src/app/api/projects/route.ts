import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { organizationId: ctx.organization.id },
    include: { program: true },
    orderBy: { code: "asc" },
  });
  return NextResponse.json(projects);
}

const createSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  programId: z.string().optional().nullable(),
  businessUnit: z.string().optional(),
  pm: z.string().optional(),
  priority: z.string().default("Medium"),
  portfolioCategory: z.string().default("Business Strategic"),
  deliveryMethod: z.string().default("Waterfall"),
  fundingType: z.string().default("CAPEX"),
  governanceChannel: z.string().default("Channel A"),
  funding: z.number().default(0),
  financialYear: z.string().optional(),
});

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role)) {
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  }

  const projectCount = await db.project.count({
    where: { organizationId: ctx.organization.id },
  });
  const limit = ctx.organization.plan?.projectLimit ?? 25;
  if (projectCount >= limit) {
    return NextResponse.json(
      { error: `Project limit reached (${limit}). Upgrade your plan.` },
      { status: 403 }
    );
  }

  const body = createSchema.parse(await req.json());
  const project = await db.project.create({
    data: {
      organizationId: ctx.organization.id,
      code: body.code,
      name: body.name,
      programId: body.programId || null,
      businessUnit: body.businessUnit,
      pm: body.pm,
      priority: body.priority,
      portfolioCategory: body.portfolioCategory,
      deliveryMethod: body.deliveryMethod,
      fundingType: body.fundingType,
      governanceChannel: body.governanceChannel,
      funding: body.funding,
      forecast: body.funding,
      financialYear: body.financialYear || "FY26",
      status: "Active",
      rag: "Green",
      stage: "Discovery",
    },
  });

  return NextResponse.json(project, { status: 201 });
}
