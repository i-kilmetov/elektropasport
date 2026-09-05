import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { ValidatedTelegramUser } from "@/lib/telegram-auth";
import { AuthError } from "@/lib/telegram-auth";
import { telegramFetch } from "@/lib/telegram-fetch";
import { verifyTelegramOidcToken } from "@/lib/telegram-jwks";

const OAUTH_COOKIE = "ep_tg_oauth";

export type OAuthPkceState = {
  state: string;
  verifier: string;
  /** Browser origin that started login (e.g. https://test.tokom.ru). */
  returnOrigin?: string;
  /** Persist test vs prod user rows when callback runs on apex. */
  appEnv?: "prod" | "test";
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

export type OidcExchangeMode = "server" | "browser" | "auto";

/**
 * Where the authorization code is exchanged for an id_token.
 * "browser" is required where the server cannot reach oauth.telegram.org
 * (RF hosting): the user's browser can, and PKCE keeps the flow safe.
 */
export function oidcExchangeMode(): OidcExchangeMode {
  const raw = process.env.TELEGRAM_OIDC_EXCHANGE?.trim().toLowerCase();
  if (raw === "server" || raw === "browser") return raw;
  return "auto";
}

function loginContextSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.TEST_SITE_SECRET?.trim() ||
    process.env.BOT_TOKEN?.trim() ||
    ""
  );
}

export type LoginContext = {
  returnOrigin?: string;
  appEnv?: "prod" | "test";
  exp: number;
};

/** Signed hand-off between the callback page and /api/auth/telegram/complete. */
export function signLoginContext(context: LoginContext): string {
  const payload = Buffer.from(JSON.stringify(context), "utf8").toString(
    "base64url",
  );
  const mac = createHmac("sha256", loginContextSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${mac}`;
}

export function verifyLoginContext(raw: string): LoginContext | null {
  if (!loginContextSecret()) return null;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac) return null;
  const expected = createHmac("sha256", loginContextSecret())
    .update(payload)
    .digest("base64url");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(mac, "utf8");
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as LoginContext;
    if (!parsed || typeof parsed.exp !== "number") return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
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
    const appEnv =
      parsed.appEnv === "test" || parsed.appEnv === "prod"
        ? parsed.appEnv
        : undefined;
    let returnOrigin: string | undefined;
    if (typeof parsed.returnOrigin === "string" && parsed.returnOrigin) {
      try {
        const origin = new URL(parsed.returnOrigin).origin;
        if (
          origin === "https://tokom.ru" ||
          origin === "https://www.tokom.ru" ||
          origin === "https://test.tokom.ru" ||
          origin === "https://www.test.tokom.ru"
        ) {
          returnOrigin = origin;
        }
      } catch {
        // ignore
      }
    }
    return {
      state: parsed.state,
      verifier: parsed.verifier,
      returnOrigin,
      appEnv,
    };
  } catch {
    return null;
  }
}

export function oauthCookieHeader(
  value: OAuthPkceState | null,
  options?: { domain?: string },
): string {
  const host = options?.domain?.replace(/^\./, "").toLowerCase() ?? "";
  // Share PKCE cookie across apex / www / test so staging can use the
  // BotFather-registered https://tokom.ru/auth/telegram/callback.
  const domainAttr =
    host === "tokom.ru" ||
    host === "www.tokom.ru" ||
    host === "test.tokom.ru" ||
    host === "www.test.tokom.ru"
      ? "; Domain=.tokom.ru"
      : "";
  if (!value) {
    return `${OAUTH_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0${domainAttr}`;
  }
  const encoded = encodeURIComponent(serializeOAuthCookie(value));
  return `${OAUTH_COOKIE}=${encoded}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600${domainAttr}`;
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

  const res = await telegramFetch("https://oauth.telegram.org/token", {
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
  const payload = await verifyTelegramOidcToken(idToken, clientId);

  // Telegram OIDC: `sub` is an opaque subject, NOT the Telegram user id.
  // The numeric Telegram user id is only in the `id` claim (scope: profile).
  // Using `sub` here creates a different empty account and hides panels in DB.
  const rawId = payload.id;
  const telegramId =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string"
        ? Number(rawId)
        : NaN;
  if (!Number.isFinite(telegramId) || telegramId <= 0) {
    throw new AuthError(
      "В токене Telegram нет user id (нужен scope profile / claim id)",
    );
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
