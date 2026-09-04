import { NextResponse } from "next/server";
import {
  clearTestSiteLockout,
  getTestSiteLockoutStatus,
  recordTestSiteFailedAttempt,
} from "@/lib/test-site-auth-lockout";
import {
  TEST_SITE_COOKIE,
  signTestSiteCookie,
  testSiteCookieOptions,
  testSitePasswordConfigured,
  verifyTestSiteCookie,
  verifyTestSitePassword,
} from "@/lib/test-site-auth";
import { resolveRequestOrigin } from "@/lib/app-url";
import { buildPostTestLoginUrl } from "@/lib/splash-session";

function readTestSiteCookie(request: Request): string {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${TEST_SITE_COOKIE}=`));
  const raw = match?.slice(`${TEST_SITE_COOKIE}=`.length) ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function safeNextPath(raw: string | null | undefined): string {
  const value = (raw ?? "/").trim() || "/";
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("://") ||
    value.includes("\\")
  ) {
    return "/";
  }
  return value;
}

function loginRedirect(request: Request, next: string): URL {
  const url = new URL("/test-login", `${resolveRequestOrigin(request)}/`);
  if (next && next !== "/") url.searchParams.set("next", next);
  return url;
}

export async function GET(request: Request) {
  if (!testSitePasswordConfigured()) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  const lockout = await getTestSiteLockoutStatus(request);
  if (lockout.locked) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        locked: true,
        retryAfterMs: lockout.retryAfterMs,
        error: lockout.message,
      },
      { status: 429 },
    );
  }

  const status = await verifyTestSiteCookie(readTestSiteCookie(request));
  const response = NextResponse.json({
    ok: status.ok,
    configured: true,
    locked: false,
    expired: !status.ok && status.reason === "expired",
  });
  if (status.ok) {
    const token = await signTestSiteCookie(Date.now());
    if (token) {
      response.cookies.set(TEST_SITE_COOKIE, token, testSiteCookieOptions());
    }
  }
  return response;
}

async function handlePasswordAttempt(
  request: Request,
  password: string,
): Promise<
  | { ok: true; token: string }
  | {
      ok: false;
      status: number;
      error: string;
      locked?: boolean;
      retryAfterMs?: number;
    }
> {
  if (!testSitePasswordConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "TEST_SITE_PASSWORD не настроен на сервере",
    };
  }

  const lockout = await getTestSiteLockoutStatus(request);
  if (lockout.locked) {
    return {
      ok: false,
      status: 429,
      error: lockout.message ?? "Слишком много попыток. Попробуйте позже.",
      locked: true,
      retryAfterMs: lockout.retryAfterMs,
    };
  }

  if (!verifyTestSitePassword(password)) {
    const afterFail = await recordTestSiteFailedAttempt(request);
    if (afterFail.locked) {
      return {
        ok: false,
        status: 429,
        error: afterFail.message ?? "Слишком много попыток. Попробуйте позже.",
        locked: true,
        retryAfterMs: afterFail.retryAfterMs,
      };
    }
    return { ok: false, status: 401, error: "Неверный пароль" };
  }

  await clearTestSiteLockout(request);
  const token = await signTestSiteCookie();
  if (!token) {
    return {
      ok: false,
      status: 503,
      error: "TEST_SITE_PASSWORD не настроен на сервере",
    };
  }
  return { ok: true, token };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const isForm =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  if (isForm) {
    const form = await request.formData();
    const password = String(form.get("password") ?? "").trim();
    const next = safeNextPath(String(form.get("next") ?? "/"));
    const result = await handlePasswordAttempt(request, password);
    if (!result.ok) {
      const redirect = loginRedirect(request, next);
      redirect.searchParams.set("error", result.error);
      if (result.locked && result.retryAfterMs) {
        redirect.searchParams.set("retry", String(result.retryAfterMs));
      }
      return NextResponse.redirect(redirect, 303);
    }
    // Absolute public URL so Amvera never rewrites Location to 0.0.0.0:3000.
    const origin = resolveRequestOrigin(request);
    const destination = new URL(buildPostTestLoginUrl(next, origin), `${origin}/`);
    const response = NextResponse.redirect(destination, 303);
    response.cookies.set(TEST_SITE_COOKIE, result.token, testSiteCookieOptions());
    return response;
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = body.password?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const result = await handlePasswordAttempt(request, password);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        locked: result.locked,
        retryAfterMs: result.retryAfterMs,
      },
      { status: result.status },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(TEST_SITE_COOKIE, result.token, testSiteCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(TEST_SITE_COOKIE, "", {
    ...testSiteCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
