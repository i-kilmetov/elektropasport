import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LEGACY_VERCEL_HOST, PRODUCTION_APP_URL } from "@/lib/app-url";

/**
 * elektropasport.vercel.app and tokom.ru are the same deployment + same DB.
 * Send everyone to the canonical host so sessions and OAuth stay consistent.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host !== LEGACY_VERCEL_HOST) {
    return NextResponse.next();
  }

  const target = new URL(request.url);
  const canonical = new URL(PRODUCTION_APP_URL);
  target.protocol = canonical.protocol;
  target.host = canonical.host;
  return NextResponse.redirect(target, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
