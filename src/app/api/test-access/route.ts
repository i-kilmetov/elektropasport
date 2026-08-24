import { NextResponse } from "next/server";
import {
  TEST_SITE_COOKIE,
  signTestSiteCookie,
  testSitePasswordConfigured,
  verifyTestSiteCookie,
  verifyTestSitePassword,
} from "@/lib/test-site-auth";

export async function GET(request: Request) {
  if (!testSitePasswordConfigured()) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${TEST_SITE_COOKIE}=`));
  const raw = match?.slice(`${TEST_SITE_COOKIE}=`.length) ?? "";
  let cookie = raw;
  try {
    cookie = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  const ok = await verifyTestSiteCookie(cookie);
  return NextResponse.json({ ok, configured: true });
}

export async function POST(request: Request) {
  if (!testSitePasswordConfigured()) {
    return NextResponse.json(
      { error: "TEST_SITE_PASSWORD не настроен на сервере" },
      { status: 503 },
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
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }

  const token = await signTestSiteCookie();
  if (!token) {
    return NextResponse.json(
      { error: "TEST_SITE_PASSWORD не настроен на сервере" },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(TEST_SITE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(TEST_SITE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
