import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  LEGACY_VERCEL_HOST,
  PRODUCTION_APP_URL,
} from "@/lib/app-url";
import {
  isTestAppHost,
  isTestAppWwwHost,
  TEST_APP_HOST,
} from "@/lib/app-env";

/**
 * elektropasport.vercel.app and tokom.ru are the same deployment + same DB.
 * test.tokom.ru uses the same deployment but gates access in the client
 * (password on every refresh + 10 min idle timeout).
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();

  if (isTestAppWwwHost(host)) {
    const canonical = new URL(request.url);
    canonical.hostname = TEST_APP_HOST;
    return NextResponse.redirect(canonical, 308);
  }

  if (isTestAppHost(host)) {
    return NextResponse.next();
  }

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
