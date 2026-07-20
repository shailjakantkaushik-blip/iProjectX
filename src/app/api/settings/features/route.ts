import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentContext, isAdminRole } from "@/lib/auth";

const schema = z.object({
  enableExcelImport: z.boolean(),
  enablePptExport: z.boolean(),
  enablePdfExport: z.boolean(),
});

export async function PATCH(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(ctx.membership.role)) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const updated = await db.organization.update({
    where: { id: ctx.organization.id },
    data: body,
  });
  return NextResponse.json({ ok: true, organization: updated });
}
