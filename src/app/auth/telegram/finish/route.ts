import { NextResponse } from "next/server";
import {
  POST_AUTH_NEXT_KEY,
  POST_AUTH_SKIP_SPLASH_KEY,
} from "@/lib/auth-flow";

/**
 * Cross-host OAuth handoff landing (test.tokom.ru).
 * Inline HTML — no React hydration required (token lives in location.hash).
 */
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Вход…</title>
  <style>
    body {
      margin: 0;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      font: 16px/1.4 system-ui, sans-serif;
      color: #52525b;
      background: #f4f4f5;
    }
  </style>
</head>
<body>
  <p id="msg">Завершаем вход…</p>
  <script>
    (function () {
      var msg = document.getElementById("msg");
      function fail(text) {
        if (msg) msg.textContent = text;
      }
      try {
        var raw = String(location.hash || "").replace(/^#/, "");
        var params = new URLSearchParams(raw);
        var token = (params.get("token") || "").trim();
        var user = (params.get("user") || "").trim();
        if (!token || !user) {
          fail("Сессия входа не найдена. Попробуйте войти ещё раз.");
          return;
        }
        JSON.parse(user);
        localStorage.setItem("elektropasport:auth-token", token);
        localStorage.setItem("elektropasport:auth-user", user);
        sessionStorage.setItem(${JSON.stringify(POST_AUTH_SKIP_SPLASH_KEY)}, "1");
        var next = "/";
        var stored = sessionStorage.getItem(${JSON.stringify(POST_AUTH_NEXT_KEY)});
        if (stored) {
          if (
            stored.charAt(0) === "/" &&
            stored.charAt(1) !== "/" &&
            stored.indexOf("\\\\") === -1 &&
            stored.indexOf("://") === -1
          ) {
            next = stored;
          }
        }
        sessionStorage.removeItem(${JSON.stringify(POST_AUTH_NEXT_KEY)});
        location.replace(next);
      } catch (e) {
        fail("Не удалось завершить вход. Попробуйте ещё раз.");
      }
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
