import { createHmac, timingSafeEqual } from "crypto";

export type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type ValidatedTelegramUser = {
  telegramId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
};

const MAX_AUTH_AGE_SEC = 60 * 60 * 24; // 24 hours

/**
 * Validates Telegram Mini App initData (HMAC-SHA256) and returns the user.
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
): ValidatedTelegramUser {
  if (!initData?.trim()) {
    throw new AuthError("Отсутствуют данные Telegram (initData)");
  }
  if (!botToken?.trim()) {
    throw new AuthError("BOT_TOKEN не настроен на сервере");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new AuthError("В initData нет hash");
  }

  params.delete("hash");
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const calculatedBuf = Buffer.from(calculated, "hex");
  const hashBuf = Buffer.from(hash, "hex");
  if (
    calculatedBuf.length !== hashBuf.length ||
    !timingSafeEqual(calculatedBuf, hashBuf)
  ) {
    throw new AuthError("Подпись initData неверна");
  }

  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw ? Number(authDateRaw) : NaN;
  if (!Number.isFinite(authDate)) {
    throw new AuthError("Некорректный auth_date");
  }
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age > MAX_AUTH_AGE_SEC) {
    throw new AuthError("Сессия Telegram устарела — переоткройте Mini App");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new AuthError("В initData нет user");
  }

  let user: TelegramWebAppUser;
  try {
    user = JSON.parse(userRaw) as TelegramWebAppUser;
  } catch {
    throw new AuthError("Не удалось разобрать user из initData");
  }

  if (!user?.id || typeof user.id !== "number") {
    throw new AuthError("Некорректный Telegram user id");
  }

  return {
    telegramId: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
  };
}

export function getBotToken(): string {
  return process.env.BOT_TOKEN?.trim() ?? "";
}

export function requireTelegramUser(request: Request): ValidatedTelegramUser {
  const botToken = getBotToken();
  if (!botToken) {
    throw new AuthError("BOT_TOKEN не настроен на сервере", 503);
  }

  const initData = extractInitData(request);
  return validateTelegramInitData(initData, botToken);
}

function extractInitData(request: Request): string {
  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("tma ")) {
    return auth.slice(4).trim();
  }

  const header = request.headers.get("x-telegram-init-data");
  if (header) return header.trim();

  return "";
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
}
