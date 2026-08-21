import { createHash, randomBytes } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { ValidatedTelegramUser } from "@/lib/telegram-auth";
import { AuthError } from "@/lib/telegram-auth";

const OAUTH_COOKIE = "ep_tg_oauth";
const JWKS = createRemoteJWKSet(
  new URL("https://oauth.telegram.org/.well-known/jwks.json"),
);

export type OAuthPkceState = {
  state: string;
  verifier: string;
};

export function getTelegramClientId(): string {
  const fromEnv = process.env.TELEGRAM_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  const token = process.env.BOT_TOKEN?.trim() ?? "";
  const id = token.split(":")[0]?.trim() ?? "";
  return id;
}

export function getTelegramClientSecret(): string {
  return process.env.TELEGRAM_CLIENT_SECRET?.trim() ?? "";
}

export function canUseOidcLogin(): boolean {
  return Boolean(getTelegramClientId() && getTelegramClientSecret());
}

export function createPkcePair(): OAuthPkceState {
  const state = randomBytes(16).toString("hex");
  const verifier = randomBytes(32).toString("base64url");
  return { state, verifier };
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function buildOidcAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL("https://oauth.telegram.org/auth");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/** Legacy Login Widget OAuth page — shows QR, returns id/hash to return_to. */
export function buildLegacyAuthUrl(params: {
  botId: string;
  origin: string;
  returnTo: string;
}): string {
  const url = new URL("https://oauth.telegram.org/auth");
  url.searchParams.set("bot_id", params.botId);
  url.searchParams.set("origin", params.origin);
  url.searchParams.set("request_access", "write");
  url.searchParams.set("return_to", params.returnTo);
  return url.toString();
}

export function serializeOAuthCookie(value: OAuthPkceState): string {
  return JSON.stringify(value);
}

export function parseOAuthCookie(raw: string | undefined): OAuthPkceState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OAuthPkceState;
    if (!parsed?.state || !parsed?.verifier) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function oauthCookieHeader(value: OAuthPkceState | null): string {
  if (!value) {
    return `${OAUTH_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  }
  const encoded = encodeURIComponent(serializeOAuthCookie(value));
  return `${OAUTH_COOKIE}=${encoded}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export function readOAuthCookie(request: Request): OAuthPkceState | null {
  const header = request.headers.get("cookie") ?? "";
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${OAUTH_COOKIE}=`));
  if (!match) return null;
  return parseOAuthCookie(decodeURIComponent(match.slice(OAUTH_COOKIE.length + 1)));
}

export async function exchangeAuthorizationCode(params: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  const basic = Buffer.from(
    `${params.clientId}:${params.clientSecret}`,
    "utf8",
  ).toString("base64");

  const res = await fetch("https://oauth.telegram.org/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      code_verifier: params.codeVerifier,
    }),
  });

  const data = (await res.json()) as {
    id_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.id_token) {
    throw new AuthError(
      data.error_description || data.error || "Не удалось обменять код Telegram",
      401,
    );
  }

  return data.id_token;
}

export async function validateTelegramIdToken(
  idToken: string,
  clientId: string,
): Promise<ValidatedTelegramUser> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: "https://oauth.telegram.org",
    audience: clientId,
  });

  const telegramId = Number(payload.id ?? payload.sub);
  if (!Number.isFinite(telegramId) || telegramId <= 0) {
    throw new AuthError("В токене Telegram нет user id");
  }

  const given =
    typeof payload.given_name === "string" ? payload.given_name : undefined;
  const family =
    typeof payload.family_name === "string" ? payload.family_name : undefined;
  const name = typeof payload.name === "string" ? payload.name : undefined;
  const preferred =
    typeof payload.preferred_username === "string"
      ? payload.preferred_username
      : undefined;

  return {
    telegramId,
    firstName: given ?? name?.split(/\s+/)[0],
    lastName:
      family ??
      (name && name.trim().includes(" ")
        ? name.trim().split(/\s+/).slice(1).join(" ")
        : undefined),
    username: preferred,
  };
}
