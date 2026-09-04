import { NextResponse } from "next/server";
import { isTestAppHost } from "@/lib/app-env";
import { resolveOAuthOrigin, publicRequestUrl, resolveRequestOrigin } from "@/lib/app-url";
import {
  buildLegacyAuthUrl,
  buildOidcAuthUrl,
  canUseOidcLogin,
  createPkcePair,
  getTelegramClientId,
  oauthCookieHeader,
  pkceChallenge,
} from "@/lib/telegram-oauth";

export async function GET(request: Request) {
  const browserHost = new URL(resolveRequestOrigin(request)).host;
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

  // test.tokom.ru uses its own origin (must be in BotFather allowlist).
  const oauthOrigin = resolveOAuthOrigin(request);
  const redirectUri = `${oauthOrigin}/auth/telegram/callback`;

  if (canUseOidcLogin()) {
    const pkce = createPkcePair();
    const authUrl = buildOidcAuthUrl({
      clientId,
      redirectUri,
      state: pkce.state,
      codeChallenge: pkceChallenge(pkce.verifier),
    });

    const response = NextResponse.redirect(authUrl);
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
