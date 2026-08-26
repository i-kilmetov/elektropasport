import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import { dbErrorResponse, ensureSchema, upsertUser } from "@/lib/db";
import { sendWebPushToUser } from "@/lib/web-push";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const result = await sendWebPushToUser(user.telegramId, {
      title: "Током",
      body: "Уведомления включены. Мы напишем, когда мастер примет заявку.",
      url: "/",
    });

    if (result.sent === 0) {
      return Response.json(
        { error: "Нет активной подписки на этом устройстве" },
        { status: 400 },
      );
    }

    return Response.json({ ok: true, sent: result.sent });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
