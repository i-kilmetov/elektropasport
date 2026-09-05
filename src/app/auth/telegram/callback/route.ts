import { NextResponse } from "next/server";
import {
  getBotToken,
  validateTelegramLoginWidget,
  type TelegramLoginWidgetData,
  type ValidatedTelegramUser,
} from "@/lib/telegram-auth";
import {
  appEnvFromRequest,
  isTestAppHost,
  toStorageTelegramId,
  toTelegramChatId,
  type AppEnv,
} from "@/lib/app-env";
import { signSessionToken } from "@/lib/session-token";
import {
  consumeTelegramOAuthPkce,
  ensureSchema,
  getStoredUserProfile,
  recordUserPdConsent,
  updateStoredUserProfile,
  upsertUser,
  userHasPdConsent,
} from "@/lib/db";
import {
  isPdConsentCookieValid,
  PD_CONSENT_VERSION,
  pdConsentCookieHeader,
  readPdConsentCookie,
} from "@/lib/pd-consent";
import {
  canUseOidcLogin,
  exchangeAuthorizationCode,
  getTelegramClientId,
  getTelegramClientSecret,
  oauthCookieHeader,
  readOAuthCookie,
  type OAuthPkceState,
  validateTelegramIdToken,
} from "@/lib/telegram-oauth";
import {
  publicRequestUrl,
  resolveOAuthOrigin,
  resolveRequestOrigin,
  TEST_APP_URL,
} from "@/lib/app-url";
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

function sessionHtml(user: ValidatedTelegramUser, token: string, origin: string): string {
  const userJson = JSON.stringify({
    telegramId: user.telegramId,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
  });
  const safeOrigin = escapeJsString(origin.replace(/\/$/, ""));

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Вход…</title>
</head>
<body>
  <script>
    var origin = '${safeOrigin}';
    var next = origin + '/';
    try {
      localStorage.setItem('elektropasport:auth-token', '${escapeJsString(token)}');
      localStorage.setItem('elektropasport:auth-user', '${escapeJsString(userJson)}');
      sessionStorage.setItem('${POST_AUTH_SKIP_SPLASH_KEY}', '1');
      var stored = sessionStorage.getItem('${POST_AUTH_NEXT_KEY}') || '/';
      sessionStorage.removeItem('${POST_AUTH_NEXT_KEY}');
      if (
        stored.charAt(0) !== '/' ||
        stored.charAt(1) === '/' ||
        stored.indexOf('\\\\') !== -1 ||
        stored.indexOf('://') !== -1
      ) {
        stored = '/';
      }
      next = origin + stored;
    } catch (e) {}
    window.location.replace(next);
  </script>
</body>
</html>`;
}

/** Hand off session to another tokom host (hash — not sent to the server). */
function crossOriginHandoffHtml(
  returnOrigin: string,
  user: ValidatedTelegramUser,
  token: string,
): string {
  const payload = new URLSearchParams({
    token,
    user: JSON.stringify({
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    }),
  });
  const target = `${returnOrigin.replace(/\/$/, "")}/auth/telegram/finish#${payload.toString()}`;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Вход…</title>
</head>
<body>
  <script>
    window.location.replace(${JSON.stringify(target)});
  </script>
</body>
</html>`;
}

async function finishLogin(
  user: ValidatedTelegramUser,
  request: Request,
  options?: { returnOrigin?: string; appEnv?: AppEnv },
): Promise<NextResponse> {
  const requestOrigin = resolveRequestOrigin(request);
  const host = new URL(requestOrigin).host;
  const telegramAuthDisabled =
    process.env.DISABLE_BROWSER_TELEGRAM_AUTH?.trim().toLowerCase() === "1" ||
    process.env.DISABLE_BROWSER_TELEGRAM_AUTH?.trim().toLowerCase() === "true";
  if (telegramAuthDisabled && !isTestAppHost(host) && options?.appEnv !== "test") {
    return NextResponse.redirect(publicRequestUrl("/?auth_error=closed", request));
  }

  const env: AppEnv =
    options?.appEnv ??
    appEnvFromRequest(request);
  const realTelegramId = toTelegramChatId(user.telegramId);
  const storageUser: ValidatedTelegramUser = {
    ...user,
    telegramId: toStorageTelegramId(realTelegramId, env),
    appEnv: env,
  };

  await ensureSchema();
  await upsertUser(storageUser);

  const consentVersion = readPdConsentCookie(request);
  if (isPdConsentCookieValid(consentVersion)) {
    await recordUserPdConsent(storageUser.telegramId, PD_CONSENT_VERSION);
  }

  const alreadyConsented = await userHasPdConsent(storageUser.telegramId);

  const existing = await getStoredUserProfile(storageUser.telegramId);
  if (
    !existing.firstName &&
    !existing.lastName &&
    (user.firstName || user.lastName)
  ) {
    await updateStoredUserProfile(storageUser.telegramId, {
      ...existing,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  const token = signSessionToken({
    telegramId: realTelegramId,
    appEnv: env,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
  });
  const displayUser: ValidatedTelegramUser = {
    telegramId: realTelegramId,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    appEnv: env,
  };

  const returnOrigin = (
    options?.returnOrigin ||
    (options?.appEnv === "test" ? TEST_APP_URL : requestOrigin)
  ).replace(/\/$/, "");
  const sameOrigin = returnOrigin === requestOrigin.replace(/\/$/, "");
  const response = new NextResponse(
    sameOrigin
      ? sessionHtml(displayUser, token, returnOrigin)
      : crossOriginHandoffHtml(returnOrigin, displayUser, token),
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
  response.headers.append(
    "Set-Cookie",
    oauthCookieHeader(null, {
      domain: host,
    }),
  );
  if (alreadyConsented || isPdConsentCookieValid(consentVersion)) {
    response.headers.append("Set-Cookie", pdConsentCookieHeader());
  }
  return response;
}

async function resolveOidcPkce(
  request: Request,
  state: string,
): Promise<OAuthPkceState | null> {
  try {
    const fromDb = await consumeTelegramOAuthPkce(state);
    if (fromDb) return fromDb;
  } catch (error) {
    console.error("consumeTelegramOAuthPkce", error);
  }
  const fromCookie = readOAuthCookie(request);
  if (fromCookie && fromCookie.state === state) return fromCookie;
  return null;
}

/** Prefer test host when Referer shows staging; else apex. */
function pkceReturnHint(request: Request): string {
  const referer = request.headers.get("referer") ?? "";
  try {
    if (referer) {
      const origin = new URL(referer).origin;
      if (
        origin === "https://test.tokom.ru" ||
        origin === "https://www.test.tokom.ru"
      ) {
        return origin;
      }
    }
  } catch {
    // ignore
  }
  return resolveRequestOrigin(request).replace(/\/$/, "");
}

export async function GET(request: Request) {
  // Remembered so a failed exchange still returns the user to the host they
  // started from (test.tokom.ru) instead of the prod waitlist page.
  let loginOrigin: string | null = null;
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (code && state && canUseOidcLogin()) {
      const pkce = await resolveOidcPkce(request, state);
      if (!pkce) {
        console.error("telegram oauth: missing PKCE for state", state.slice(0, 8));
        return NextResponse.redirect(`${pkceReturnHint(request)}/?auth_error=state`);
      }

      const returnOrigin =
        pkce.returnOrigin ||
        (pkce.appEnv === "test" ? TEST_APP_URL : undefined);
      loginOrigin = returnOrigin ?? null;

      const clientId = getTelegramClientId();
      const clientSecret = getTelegramClientSecret();
      // Must match the redirect_uri used at /api/auth/telegram/start (BotFather allowlist).
      const redirectUri = `${resolveOAuthOrigin(request)}/auth/telegram/callback`;
      const idToken = await exchangeAuthorizationCode({
        code,
        redirectUri,
        codeVerifier: pkce.verifier,
        clientId,
        clientSecret,
      });
      const user = await validateTelegramIdToken(idToken, clientId);
      return finishLogin(user, request, {
        returnOrigin,
        appEnv: pkce.appEnv,
      });
    }

    const botToken = getBotToken();
    if (!botToken) {
      return NextResponse.redirect(publicRequestUrl("/?auth_error=config", request));
    }

    const raw = parseLoginParams(url);
    if (!raw || !Number.isFinite(raw.id)) {
      return NextResponse.redirect(publicRequestUrl("/?auth_error=invalid", request));
    }

    const user = validateTelegramLoginWidget(raw, botToken);
    return finishLogin(user, request);
  } catch (error) {
    console.error("telegram oauth callback", error);
    const base = (loginOrigin ?? pkceReturnHint(request)).replace(/\/$/, "");
    return NextResponse.redirect(`${base}/?auth_error=failed`);
  }
}
