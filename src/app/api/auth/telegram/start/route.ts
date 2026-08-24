import { NextResponse } from "next/server";
import { resolveOAuthOrigin, resolveRequestOrigin } from "@/lib/app-url";
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
  const clientId = getTelegramClientId();
  if (!clientId) {
    return NextResponse.redirect(new URL("/?auth_error=config", request.url));
  }

  // Must match BotFather Redirect URI allowlist (https://tokom.ru/...),
  // even when the browser is on www.tokom.ru.
  const oauthOrigin = resolveOAuthOrigin(request);
  const browserHost = new URL(resolveRequestOrigin(request)).host;
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

  // Legacy Telegram Login page with QR (no Client Secret required).
  const authUrl = buildLegacyAuthUrl({
    botId: clientId,
    origin: oauthOrigin,
    returnTo: redirectUri,
  });
  return NextResponse.redirect(authUrl);
}
