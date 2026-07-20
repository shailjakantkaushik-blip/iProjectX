import { NextResponse } from "next/server";
import { getCurrentContext } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { buildPdfBuffer } from "@/lib/export-deck";

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const site = await getSiteConfig();
  if (!site.enablePdfExport || !ctx.organization.enablePdfExport) {
    return NextResponse.json({ error: "PDF export is disabled" }, { status: 403 });
  }

  const buffer = await buildPdfBuffer(ctx.organization.id);
  const filename = `${ctx.organization.slug}_executive_pack.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
