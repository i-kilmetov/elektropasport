import { NextResponse } from "next/server";
import {
  TEST_SITE_COOKIE,
  signTestSiteCookie,
  verifyTestSitePassword,
} from "@/lib/test-site-auth";

export async function POST(request: Request) {
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

  const token = signTestSiteCookie();
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
