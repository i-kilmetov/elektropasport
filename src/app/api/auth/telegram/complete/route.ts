import { NextResponse } from "next/server";
import { appEnvFromRequest, isTestAppHost } from "@/lib/app-env";
import { resolveRequestOrigin, TEST_APP_URL } from "@/lib/app-url";
import { establishTelegramSession } from "@/lib/auth-session";
import { pdConsentCookieHeader } from "@/lib/pd-consent";
import { AuthError } from "@/lib/telegram-auth";
import {
  getTelegramClientId,
  validateTelegramIdToken,
  verifyLoginContext,
} from "@/lib/telegram-oauth";

/**
 * Completes a login whose code was exchanged in the user's browser
 * (see the callback route's browser exchange page). The id_token signature is
 * verified server-side against pinned Telegram keys, so a forged token cannot
 * create a session.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      ctx?: unknown;
      idToken?: unknown;
    };
    const rawContext = typeof body.ctx === "string" ? body.ctx : "";
    const idToken = typeof body.idToken === "string" ? body.idToken : "";
    if (!rawContext || !idToken) {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
    }

    const context = verifyLoginContext(rawContext);
    if (!context) {
      return NextResponse.json(
        { error: "Сессия входа истекла — попробуйте снова" },
        { status: 400 },
      );
    }

    const clientId = getTelegramClientId();
    if (!clientId) {
      return NextResponse.json(
        { error: "Telegram OAuth не настроен" },
        { status: 503 },
      );
    }

    const user = await validateTelegramIdToken(idToken, clientId);
    const env = context.appEnv ?? appEnvFromRequest(request);

    const disabled =
      process.env.DISABLE_BROWSER_TELEGRAM_AUTH?.trim().toLowerCase() === "1" ||
      process.env.DISABLE_BROWSER_TELEGRAM_AUTH?.trim().toLowerCase() === "true";
    const requestOrigin = resolveRequestOrigin(request);
    if (disabled && env !== "test" && !isTestAppHost(new URL(requestOrigin).host)) {
      return NextResponse.json({ error: "Вход закрыт" }, { status: 403 });
    }

    const session = await establishTelegramSession(user, request, env);
    const returnOrigin = (
      context.returnOrigin || (env === "test" ? TEST_APP_URL : requestOrigin)
    ).replace(/\/$/, "");

    const response = NextResponse.json(
      { token: session.token, user: session.user, returnOrigin },
      { headers: { "Cache-Control": "no-store" } },
    );
    if (session.pdConsent) {
      response.headers.append("Set-Cookie", pdConsentCookieHeader());
    }
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("telegram login complete", error);
    return NextResponse.json({ error: "Не удалось войти" }, { status: 500 });
  }
}
