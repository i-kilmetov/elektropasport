import {
  authErrorResponse,
  getBotToken,
  requireTelegramUser,
  validateTelegramLoginWidget,
  type TelegramLoginWidgetData,
} from "@/lib/telegram-auth";
import { signSessionToken } from "@/lib/session-token";
import { dbErrorResponse, ensureSchema, upsertUser } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const botToken = getBotToken();
    if (!botToken) {
      return Response.json(
        { error: "BOT_TOKEN не настроен на сервере" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as TelegramLoginWidgetData;
    const user = validateTelegramLoginWidget(body, botToken);
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
