import { createHmac } from "crypto";
import type { AppEnv } from "@/lib/app-env";
import { AuthError } from "@/lib/telegram-auth";

const SESSION_TTL_SEC = 60 * 60 * 24 * 30;

export type SessionPayload = {
  telegramId: number;
  /** Real Telegram user id (positive). */
  appEnv?: AppEnv;
  firstName?: string;
  lastName?: string;
  username?: string;
  exp: number;
};

/** Reject OIDC opaque `sub` values that were mistakenly stored as telegramId. */
export function isPlausibleTelegramUserId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0 && id < 10_000_000_000_000;
}

function getSecret(): string {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.BOT_TOKEN?.trim() || "";
  if (!secret) {
    throw new AuthError("AUTH_SECRET или BOT_TOKEN не настроен", 503);
  }
  return secret;
}

export function signSessionToken(
  user: Omit<SessionPayload, "exp"> & { appEnv: AppEnv },
): string {
  if (!isPlausibleTelegramUserId(user.telegramId)) {
    throw new AuthError("Некорректный Telegram user id");
  }
  const payload: SessionPayload = {
    ...user,
    telegramId: Math.abs(user.telegramId),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload {
  const [body, sig] = token.split(".");
  if (!body || !sig) {
    throw new AuthError("Некорректный токен сессии");
  }

  const expected = createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  if (expected !== sig) {
    throw new AuthError("Недействительный токен сессии");
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
  } catch {
    throw new AuthError("Некорректный токен сессии");
  }

  if (
    !isPlausibleTelegramUserId(payload.telegramId) ||
    payload.exp < Math.floor(Date.now() / 1000)
  ) {
    throw new AuthError("Сессия истекла — войдите снова");
  }

  return {
    ...payload,
    telegramId: Math.abs(payload.telegramId),
    appEnv: payload.appEnv === "test" ? "test" : "prod",
  };
}
