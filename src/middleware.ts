import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  LEGACY_VERCEL_HOST,
  PRODUCTION_APP_URL,
  TEST_APP_URL,
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
  "/api/payments/robokassa-status",
  "/api/auth/telegram",
  "/api/auth/phone",
  "/api/telegram/webhook",
  "/api/telegram/hook",
  "/auth/telegram/callback",
  "/auth/telegram/finish",
];

function isTestPublicPath(pathname: string): boolean {
  return TEST_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Public HTTPS URL without leaked internal :3000 from Amvera/proxy. */
function publicTestUrl(pathname: string, search = ""): URL {
  const url = new URL(pathname + search, TEST_APP_URL);
  url.protocol = "https:";
  url.hostname = TEST_APP_HOST;
  url.port = "";
  return url;
}

/**
 * elektropasport.vercel.app and tokom.ru are the same deployment.
 * test.tokom.ru shares the UI but gates access with TEST_SITE_PASSWORD,
 * then Telegram login. User data is isolated per host (test vs prod).
 *
 * Optional: set CANONICALIZE_VERCEL_APP_HOST=1 to 308 vercel.app → tokom.ru.
 * Leave unset when tokom.ru is fronted by a RU reverse-proxy (or when
 * vercel.app is the emergency entry while Vercel CDN IPs are filtered in RF).
 */
export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim()
    .split(":")[0]
    ?.toLowerCase();
  const pathname = request.nextUrl.pathname;

  if (isTestAppWwwHost(host) || isTestAppWwwHost(forwardedHost)) {
    return NextResponse.redirect(
      publicTestUrl(pathname, request.nextUrl.search),
      308,
    );
  }

  if (isTestAppHost(host) || isTestAppHost(forwardedHost)) {
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
      const login = publicTestUrl("/test-login");
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

  const canonicalize =
    process.env.CANONICALIZE_VERCEL_APP_HOST?.trim().toLowerCase() === "1" ||
    process.env.CANONICALIZE_VERCEL_APP_HOST?.trim().toLowerCase() === "true";

  // Behind a RU edge the Host is often *.vercel.app while users see tokom.ru.
  const publicHost = forwardedHost || host;
  if (
    canonicalize &&
    host === LEGACY_VERCEL_HOST &&
    publicHost === LEGACY_VERCEL_HOST
  ) {
    const target = new URL(request.url);
    const canonical = new URL(PRODUCTION_APP_URL);
    target.protocol = canonical.protocol;
    target.host = canonical.host;
    return NextResponse.redirect(target, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
