import { NextResponse } from "next/server";
import {
  getBotToken,
  validateTelegramLoginWidget,
  type TelegramLoginWidgetData,
} from "@/lib/telegram-auth";
import { signSessionToken } from "@/lib/session-token";
import { ensureSchema, upsertUser } from "@/lib/db";

function parseLoginParams(url: URL): TelegramLoginWidgetData | null {
  const id = url.searchParams.get("id");
  const hash = url.searchParams.get("hash");
  const authDate = url.searchParams.get("auth_date");
  if (!id || !hash || !authDate) return null;

  return {
    id: Number(id),
    first_name: url.searchParams.get("first_name") ?? undefined,
    last_name: url.searchParams.get("last_name") ?? undefined,
    username: url.searchParams.get("username") ?? undefined,
    photo_url: url.searchParams.get("photo_url") ?? undefined,
    auth_date: Number(authDate),
    hash,
  };
}

function escapeJsString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/</g, "\\u003c");
}

export async function GET(request: Request) {
  try {
    const botToken = getBotToken();
    if (!botToken) {
      return NextResponse.redirect(new URL("/?auth_error=config", request.url));
    }

    const url = new URL(request.url);
    const raw = parseLoginParams(url);
    if (!raw || !Number.isFinite(raw.id)) {
      return NextResponse.redirect(new URL("/?auth_error=invalid", request.url));
    }

    const user = validateTelegramLoginWidget(raw, botToken);
    await ensureSchema();
    await upsertUser(user);

    const token = signSessionToken({
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    });

    const userJson = JSON.stringify({
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    });

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Вход…</title>
</head>
<body>
  <script>
    try {
      localStorage.setItem('elektropasport:auth-token', '${escapeJsString(token)}');
      localStorage.setItem('elektropasport:auth-user', '${escapeJsString(userJson)}');
    } catch (e) {}
    window.location.replace('/');
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return NextResponse.redirect(new URL("/?auth_error=failed", request.url));
  }
}
