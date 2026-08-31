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
import {
  TEST_SITE_COOKIE,
  signTestSiteCookie,
  testSiteCookieOptions,
  testSitePasswordConfigured,
  verifyTestSiteCookie,
} from "@/lib/test-site-auth";

const TEST_PUBLIC_PREFIXES = [
  "/test-login",
  "/api/test-access",
  "/api/payments/robokassa-result",
  "/api/auth/telegram",
  "/api/telegram/webhook",
  "/api/telegram/hook",
  "/auth/telegram/callback",
];

function isTestPublicPath(pathname: string): boolean {
  return TEST_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * elektropasport.vercel.app and tokom.ru are the same deployment.
 * test.tokom.ru shares the UI but gates access with TEST_SITE_PASSWORD,
 * then Telegram login. User data is isolated per host (test vs prod).
 */
export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const pathname = request.nextUrl.pathname;

  if (isTestAppWwwHost(host)) {
    const canonical = new URL(request.url);
    canonical.hostname = TEST_APP_HOST;
    return NextResponse.redirect(canonical, 308);
  }

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
    const status = await verifyTestSiteCookie(cookie);
    if (!status.ok) {
      const login = new URL("/test-login", request.url);
      login.hostname = TEST_APP_HOST;
      if (status.reason === "expired") {
        login.searchParams.set("reason", "idle");
      }
      if (pathname !== "/") {
        login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      }
      return NextResponse.redirect(login);
    }

    const response = NextResponse.next();
    const token = await signTestSiteCookie(Date.now());
    if (token) {
      response.cookies.set(TEST_SITE_COOKIE, token, testSiteCookieOptions());
    }
    return response;
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
