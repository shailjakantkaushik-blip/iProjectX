import { NextResponse } from "next/server";
import { getCurrentContext, isAdminRole } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { buildImportTemplate } from "@/lib/excel";

export async function GET(req: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const site = await getSiteConfig();
  if (!site.enableExcelImport || !ctx.organization.enableExcelImport) {
    return NextResponse.json({ error: "Excel import is disabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const blank = url.searchParams.get("blank") === "1";
  const filled = !blank;

  // Any signed-in member can download; uploads remain admin/editor gated.
  void isAdminRole;
  const buffer = await buildImportTemplate(ctx.organization.id, filled);
  const filename = blank
    ? "iProjectX_Import_Template_Blank.xlsx"
    : `iProjectX_${ctx.organization.slug}_Export.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
