import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/plans",
  "/api/health",
  "/api/webhooks/stripe",
];

function isPublic(pathname: string) {
  if (PUBLIC.includes(pathname)) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { response, user, configured } = await updateSession(req);

  if (isPublic(pathname)) return response;

  if (!configured) {
    // Allow build/dev without Supabase env, but block authenticated app routes with a clear redirect.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY." },
        { status: 503 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "supabase_not_configured");
    return NextResponse.redirect(url);
  }

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
