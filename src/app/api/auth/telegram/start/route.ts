import { NextResponse } from "next/server";
import { isTestAppHost } from "@/lib/app-env";
import { isBrowserLoginEnabled } from "@/lib/phone-auth";
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
  const browserHost = new URL(resolveRequestOrigin(request)).host;
  if (!isTestAppHost(browserHost) && !isBrowserLoginEnabled()) {
    return NextResponse.redirect(new URL("/?auth_error=closed", request.url));
  }

  const clientId = getTelegramClientId();
  if (!clientId) {
    return NextResponse.redirect(new URL("/?auth_error=config", request.url));
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
