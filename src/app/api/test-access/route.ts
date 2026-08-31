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

export async function POST(request: Request) {
  if (!testSitePasswordConfigured()) {
    return NextResponse.json(
      { error: "TEST_SITE_PASSWORD не настроен на сервере" },
      { status: 503 },
    );
  }

  const lockout = await getTestSiteLockoutStatus(request);
  if (lockout.locked) {
    return NextResponse.json(
      {
        error: lockout.message,
        locked: true,
        retryAfterMs: lockout.retryAfterMs,
      },
      { status: 429 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = body.password?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  if (!verifyTestSitePassword(password)) {
    const afterFail = await recordTestSiteFailedAttempt(request);
    if (afterFail.locked) {
      return NextResponse.json(
        {
          error: afterFail.message,
          locked: true,
          retryAfterMs: afterFail.retryAfterMs,
        },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }

  await clearTestSiteLockout(request);

  const token = await signTestSiteCookie();
  if (!token) {
    return NextResponse.json(
      { error: "TEST_SITE_PASSWORD не настроен на сервере" },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(TEST_SITE_COOKIE, token, testSiteCookieOptions());
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
