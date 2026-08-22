import { NextResponse } from "next/server";
import { verifyTestSitePassword, testSitePasswordConfigured } from "@/lib/test-site-auth";

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

  return NextResponse.json({ ok: true });
}
