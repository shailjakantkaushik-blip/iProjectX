import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEdit, getCurrentContext } from "@/lib/auth";

const createSchema = z.object({
  category: z.string().min(1),
  key: z.string().min(1),
  value: z.string(),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.orgConfigItem.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { key: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role))
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });

  const body = createSchema.parse(await req.json());
  const row = await db.orgConfigItem.upsert({
    where: {
      organizationId_category_key: {
        organizationId: ctx.organization.id,
        category: body.category,
        key: body.key,
      },
    },
    create: {
      organizationId: ctx.organization.id,
      category: body.category,
      key: body.key,
      value: body.value,
      sortOrder: body.sortOrder,
    },
    update: {
      value: body.value,
      sortOrder: body.sortOrder,
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
  const existing = await db.orgConfigItem.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = await db.orgConfigItem.update({ where: { id }, data: body });
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role))
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  const { id } = z.object({ id: z.string() }).parse(await req.json());
  const existing = await db.orgConfigItem.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.orgConfigItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
