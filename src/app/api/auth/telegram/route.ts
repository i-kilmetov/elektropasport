import {
  authErrorResponse,
  getBotToken,
  requireTelegramUser,
  validateTelegramLoginWidget,
  type TelegramLoginWidgetData,
  type ValidatedTelegramUser,
} from "@/lib/telegram-auth";
import {
  appEnvFromRequest,
  isTestAppHost,
  toStorageTelegramId,
  toTelegramChatId,
} from "@/lib/app-env";
import { signSessionToken } from "@/lib/session-token";
import { dbErrorResponse, ensureSchema, upsertUser } from "@/lib/db";
import {
  getTelegramClientId,
  validateTelegramIdToken,
} from "@/lib/telegram-oauth";
import { resolveRequestOrigin } from "@/lib/app-url";
import { isBrowserLoginEnabled } from "@/lib/phone-auth";

export async function POST(request: Request) {
  try {
    const host = new URL(resolveRequestOrigin(request)).host;
    if (!isTestAppHost(host) && !isBrowserLoginEnabled()) {
      return Response.json(
        { error: "Вход временно закрыт. Оставьте email на главной." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as TelegramLoginWidgetData & {
      id_token?: string;
    };

    let user: ValidatedTelegramUser;
    if (body.id_token) {
      const clientId = getTelegramClientId();
      if (!clientId) {
        return Response.json(
          { error: "TELEGRAM_CLIENT_ID / BOT_TOKEN не настроен" },
          { status: 503 },
        );
      }
      user = await validateTelegramIdToken(body.id_token, clientId);
    } else {
      const botToken = getBotToken();
      if (!botToken) {
        return Response.json(
          { error: "BOT_TOKEN не настроен на сервере" },
          { status: 503 },
        );
      }
      user = validateTelegramLoginWidget(body, botToken);
    }

    const env = appEnvFromRequest(request);
    const realTelegramId = toTelegramChatId(user.telegramId);
    const storageUser: ValidatedTelegramUser = {
      ...user,
      telegramId: toStorageTelegramId(realTelegramId, env),
      appEnv: env,
    };

    await ensureSchema();
    await upsertUser(storageUser);

    const token = signSessionToken({
      telegramId: realTelegramId,
      appEnv: env,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    });

    return Response.json({
      token,
      user: {
        telegramId: realTelegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      },
    });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const user = requireTelegramUser(request);
    return Response.json({
      user: {
        ...user,
        telegramId: toTelegramChatId(user.telegramId),
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
