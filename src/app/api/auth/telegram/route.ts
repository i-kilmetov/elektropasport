import {
  authErrorResponse,
  getBotToken,
  requireTelegramUser,
  validateTelegramLoginWidget,
  type TelegramLoginWidgetData,
} from "@/lib/telegram-auth";
import { signSessionToken } from "@/lib/session-token";
import { dbErrorResponse, ensureSchema, upsertUser } from "@/lib/db";
import {
  getTelegramClientId,
  validateTelegramIdToken,
} from "@/lib/telegram-oauth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TelegramLoginWidgetData & {
      id_token?: string;
    };

    let user;
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

    await ensureSchema();
    await upsertUser(user);

    const token = signSessionToken({
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    });

    return Response.json({
      token,
      user: {
        telegramId: user.telegramId,
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
    return Response.json({ user });
  } catch (error) {
    return authErrorResponse(error);
  }
}
