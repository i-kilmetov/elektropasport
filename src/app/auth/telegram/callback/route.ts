import { NextResponse } from "next/server";
import {
  getBotToken,
  validateTelegramLoginWidget,
  type TelegramLoginWidgetData,
  type ValidatedTelegramUser,
} from "@/lib/telegram-auth";
import { signSessionToken } from "@/lib/session-token";
import {
  ensureSchema,
  getStoredUserProfile,
  recordUserPdConsent,
  updateStoredUserProfile,
  upsertUser,
} from "@/lib/db";
import {
  isPdConsentCookieValid,
  PD_CONSENT_VERSION,
  readPdConsentCookie,
} from "@/lib/pd-consent";
import {
  canUseOidcLogin,
  exchangeAuthorizationCode,
  getTelegramClientId,
  getTelegramClientSecret,
  oauthCookieHeader,
  readOAuthCookie,
  validateTelegramIdToken,
} from "@/lib/telegram-oauth";
import { resolveOAuthOrigin, resolveRequestOrigin } from "@/lib/app-url";
import { POST_AUTH_NEXT_KEY, POST_AUTH_SKIP_SPLASH_KEY } from "@/lib/auth-flow";

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

function sessionHtml(user: ValidatedTelegramUser, token: string): string {
  const userJson = JSON.stringify({
    telegramId: user.telegramId,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
  });

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Вход…</title>
</head>
<body>
  <script>
    var next = '/';
    try {
      localStorage.setItem('elektropasport:auth-token', '${escapeJsString(token)}');
      localStorage.setItem('elektropasport:auth-user', '${escapeJsString(userJson)}');
      sessionStorage.setItem('${POST_AUTH_SKIP_SPLASH_KEY}', '1');
      next = sessionStorage.getItem('${POST_AUTH_NEXT_KEY}') || '/';
      sessionStorage.removeItem('${POST_AUTH_NEXT_KEY}');
      if (
        next.charAt(0) !== '/' ||
        next.charAt(1) === '/' ||
        next.indexOf('\\\\') !== -1 ||
        next.indexOf('://') !== -1
      ) {
        next = '/';
      }
    } catch (e) {}
    window.location.replace(next);
  </script>
</body>
</html>`;
}

async function finishLogin(
  user: ValidatedTelegramUser,
  request: Request,
): Promise<NextResponse> {
  await ensureSchema();
  await upsertUser(user);

  const consentVersion = readPdConsentCookie(request);
  if (isPdConsentCookieValid(consentVersion)) {
    await recordUserPdConsent(user.telegramId, PD_CONSENT_VERSION);
  }

  // Keep profile display name in sync when Telegram provides one and profile is empty.
  const existing = await getStoredUserProfile(user.telegramId);
  if (!existing.firstName && !existing.lastName && (user.firstName || user.lastName)) {
    await updateStoredUserProfile(user.telegramId, {
      ...existing,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  const token = signSessionToken({
    telegramId: user.telegramId,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
  });
  return new NextResponse(sessionHtml(user, token), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": oauthCookieHeader(null, {
        domain: new URL(resolveRequestOrigin(request)).host,
      }),
    },
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (code && state && canUseOidcLogin()) {
      const pkce = readOAuthCookie(request);
      if (!pkce || pkce.state !== state) {
        return NextResponse.redirect(new URL("/?auth_error=state", request.url));
      }

      const clientId = getTelegramClientId();
      const clientSecret = getTelegramClientSecret();
      const redirectUri = `${resolveOAuthOrigin(request)}/auth/telegram/callback`;
      const idToken = await exchangeAuthorizationCode({
        code,
        redirectUri,
        codeVerifier: pkce.verifier,
        clientId,
        clientSecret,
      });
      const user = await validateTelegramIdToken(idToken, clientId);
      return finishLogin(user, request);
    }

    const botToken = getBotToken();
    if (!botToken) {
      return NextResponse.redirect(new URL("/?auth_error=config", request.url));
    }

    const raw = parseLoginParams(url);
    if (!raw || !Number.isFinite(raw.id)) {
      return NextResponse.redirect(new URL("/?auth_error=invalid", request.url));
    }

    const user = validateTelegramLoginWidget(raw, botToken);
    return finishLogin(user, request);
  } catch {
    return NextResponse.redirect(new URL("/?auth_error=failed", request.url));
  }
}
