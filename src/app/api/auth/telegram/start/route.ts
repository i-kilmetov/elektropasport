import { NextResponse } from "next/server";
import { isTestAppHost, publicHostFromHeaders } from "@/lib/app-env";
import { saveTelegramOAuthPkce } from "@/lib/db";
import {
  resolveOAuthOrigin,
  publicRequestUrl,
  resolveRequestOrigin,
  TEST_APP_URL,
} from "@/lib/app-url";
import {
  buildLegacyAuthUrl,
  buildOidcAuthUrl,
  canUseOidcLogin,
  createPkcePair,
  getTelegramClientId,
  oauthCookieHeader,
  pkceChallenge,
  type OAuthPkceState,
} from "@/lib/telegram-oauth";

export async function GET(request: Request) {
  const headerHost = publicHostFromHeaders(request.headers);
  const browserOrigin = isTestAppHost(headerHost)
    ? TEST_APP_URL
    : resolveRequestOrigin(request);
  const browserHost = new URL(browserOrigin).host;
  const clientId = getTelegramClientId();

  // Telegram OAuth (widget / OIDC) is always available when the bot client is
  // configured. Phone/Gateway login is gated separately via isBrowserLoginEnabled.
  if (!clientId) {
    return NextResponse.redirect(publicRequestUrl("/?auth_error=config", request));
  }

  // Optional hard-close (waitlist kill switch) — does not apply on test.tokom.ru.
  const telegramAuthDisabled =
    process.env.DISABLE_BROWSER_TELEGRAM_AUTH?.trim().toLowerCase() === "1" ||
    process.env.DISABLE_BROWSER_TELEGRAM_AUTH?.trim().toLowerCase() === "true";
  if (telegramAuthDisabled && !isTestAppHost(browserHost)) {
    return NextResponse.redirect(publicRequestUrl("/?auth_error=closed", request));
  }

  // Always use the BotFather-registered apex redirect_uri.
  const oauthOrigin = resolveOAuthOrigin(request);
  const redirectUri = `${oauthOrigin}/auth/telegram/callback`;

  if (canUseOidcLogin()) {
    const pair = createPkcePair();
    const pkce: OAuthPkceState = {
      ...pair,
      returnOrigin: browserOrigin,
      appEnv: isTestAppHost(browserHost) ? "test" : "prod",
    };
    try {
      await saveTelegramOAuthPkce(pkce);
    } catch (error) {
      console.error("saveTelegramOAuthPkce", error);
      return NextResponse.redirect(
        publicRequestUrl("/?auth_error=config", request),
      );
    }
    const authUrl = buildOidcAuthUrl({
      clientId,
      redirectUri,
      state: pkce.state,
      codeChallenge: pkceChallenge(pkce.verifier),
    });

    const response = NextResponse.redirect(authUrl);
    // Cookie is a fallback; primary PKCE lives in Postgres (cross-subdomain safe).
    response.headers.set(
      "Set-Cookie",
      oauthCookieHeader(pkce, { domain: browserHost }),
    );
    return response;
  }

  const authUrl = buildLegacyAuthUrl({
    botId: clientId,
    origin: oauthOrigin,
    returnTo: redirectUri,
  });
  return NextResponse.redirect(authUrl);
}
