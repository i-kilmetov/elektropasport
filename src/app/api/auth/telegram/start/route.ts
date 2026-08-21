import { NextResponse } from "next/server";
import { resolveRequestOrigin } from "@/lib/app-url";
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

  // Must match the host that sets the PKCE cookie (not NEXT_PUBLIC_APP_URL).
  const origin = resolveRequestOrigin(request);
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
