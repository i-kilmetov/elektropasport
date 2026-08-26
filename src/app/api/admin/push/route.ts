import { authErrorResponse } from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  getPushAudience,
} from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import {
  sendWebPushBroadcast,
  sendWebPushToUser,
} from "@/lib/web-push";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const audience = await getPushAudience();
    return Response.json(audience);
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = (await request.json()) as {
      title?: unknown;
      body?: unknown;
      url?: unknown;
      telegramId?: unknown;
    };

    const title =
      typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
    const text =
      typeof body.body === "string" ? body.body.trim().slice(0, 200) : "";
    const urlRaw = typeof body.url === "string" ? body.url.trim() : "/";
    const url = urlRaw.startsWith("/") ? urlRaw.slice(0, 200) : "/";

    if (!title || !text) {
      return Response.json(
        { error: "Нужны заголовок и текст" },
        { status: 400 },
      );
    }

    const payload = { title, body: text, url };
    const telegramId =
      typeof body.telegramId === "number"
        ? body.telegramId
        : typeof body.telegramId === "string"
          ? Number(body.telegramId.replace(/\D/g, ""))
          : NaN;

    if (Number.isSafeInteger(telegramId) && telegramId !== 0) {
      const result = await sendWebPushToUser(telegramId, payload);
      if (result.sent === 0) {
        return Response.json(
          { error: "У этого пользователя нет активной подписки" },
          { status: 404 },
        );
      }
      return Response.json({ ok: true, users: 1, sent: result.sent });
    }

    const result = await sendWebPushBroadcast(payload);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
