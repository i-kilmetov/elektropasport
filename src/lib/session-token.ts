import { createHmac } from "crypto";
import { AuthError } from "@/lib/telegram-auth";

const SESSION_TTL_SEC = 60 * 60 * 24 * 30;

export type SessionPayload = {
  telegramId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  exp: number;
};

function getSecret(): string {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.BOT_TOKEN?.trim() || "";
  if (!secret) {
    throw new AuthError("AUTH_SECRET или BOT_TOKEN не настроен", 503);
  }
  return secret;
}

export function signSessionToken(
  user: Omit<SessionPayload, "exp">,
): string {
  const payload: SessionPayload = {
    ...user,
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

  if (!payload.telegramId || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new AuthError("Сессия истекла — войдите снова");
  }

  return payload;
}
