import { NextResponse } from "next/server";
import { canEdit, getCurrentContext } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { importWorkbook } from "@/lib/excel";

export async function POST(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(ctx.membership.role)) {
    return NextResponse.json({ error: "Read-only role cannot import" }, { status: 403 });
  }

  const site = await getSiteConfig();
  if (!site.enableExcelImport || !ctx.organization.enableExcelImport) {
    return NextResponse.json({ error: "Excel import is disabled" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json({ error: "Only .xlsx files are supported" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await importWorkbook(ctx.organization.id, ctx.user.id, file.name, bytes);
  return NextResponse.json({
    ok: true,
    rowsUpserted: result.rowsUpserted,
    errorCount: result.errors.length,
    errors: result.errors.slice(0, 20),
    jobId: result.job.id,
  });
}
