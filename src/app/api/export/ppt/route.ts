import { NextResponse } from "next/server";
import { getCurrentContext } from "@/lib/auth";
import { getSiteConfig } from "@/lib/site-config";
import { buildPptBuffer } from "@/lib/export-deck";

export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const site = await getSiteConfig();
  if (!site.enablePptExport || !ctx.organization.enablePptExport) {
    return NextResponse.json({ error: "PPT export is disabled" }, { status: 403 });
  }

  const buffer = await buildPptBuffer(ctx.organization.id);
  const filename = `${ctx.organization.slug}_executive_pack.pptx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
