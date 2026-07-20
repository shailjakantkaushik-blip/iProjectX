import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/auth";

/** Platform admin: list orgs for invoicing. */
export async function GET() {
  const ctx = await getCurrentContext();
  if (!ctx?.user.isPlatformAdmin) {
    return NextResponse.json({ error: "Platform admin required" }, { status: 403 });
  }

  const organizations = await db.organization.findMany({
    include: {
      plan: true,
      _count: { select: { members: true, invoices: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, organizations });
}
