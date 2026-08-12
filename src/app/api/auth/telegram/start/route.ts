import { NextResponse } from "next/server";
import {
  buildLegacyAuthUrl,
  buildOidcAuthUrl,
  canUseOidcLogin,
  createPkcePair,
  getTelegramClientId,
  oauthCookieHeader,
  pkceChallenge,
} from "@/lib/telegram-oauth";

function appOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    url.host;
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const clientId = getTelegramClientId();
  if (!clientId) {
    return NextResponse.redirect(new URL("/?auth_error=config", request.url));
  }

  const origin = appOrigin(request);
  const redirectUri = `${origin}/auth/telegram/callback`;

  if (canUseOidcLogin()) {
    const pkce = createPkcePair();
    const authUrl = buildOidcAuthUrl({
      clientId,
      redirectUri,
      state: pkce.state,
      codeChallenge: pkceChallenge(pkce.verifier),
    });

    const response = NextResponse.redirect(authUrl);
    response.headers.set("Set-Cookie", oauthCookieHeader(pkce));
    return response;
  }

  // Legacy Telegram Login page with QR (no Client Secret required).
  const authUrl = buildLegacyAuthUrl({
    botId: clientId,
    origin,
    returnTo: redirectUri,
  });
  return NextResponse.redirect(authUrl);
}
