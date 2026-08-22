import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  LEGACY_VERCEL_HOST,
  PRODUCTION_APP_URL,
} from "@/lib/app-url";
import { isTestAppHost } from "@/lib/app-env";
import {
  TEST_SITE_COOKIE,
  testSitePasswordConfigured,
  verifyTestSiteCookie,
} from "@/lib/test-site-auth";

const TEST_PUBLIC_PREFIXES = [
  "/test-login",
  "/api/test-access",
  "/api/telegram/webhook",
  "/auth/telegram/callback",
];

function isTestPublicPath(pathname: string): boolean {
  return TEST_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * elektropasport.vercel.app and tokom.ru are the same deployment + same DB.
 * test.tokom.ru uses the same deployment but gates access with an admin password
 * and enables unreleased home-appliances UI.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const pathname = request.nextUrl.pathname;

  if (isTestAppHost(host)) {
    if (isTestPublicPath(pathname)) {
      return NextResponse.next();
    }

    if (!testSitePasswordConfigured()) {
      return new NextResponse(
        "TEST_SITE_PASSWORD is not configured for test.tokom.ru",
        { status: 503 },
      );
    }

    const cookie = request.cookies.get(TEST_SITE_COOKIE)?.value;
    if (!verifyTestSiteCookie(cookie)) {
      const login = new URL("/test-login", request.url);
      if (pathname !== "/") {
        login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      }
      return NextResponse.redirect(login);
    }

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
