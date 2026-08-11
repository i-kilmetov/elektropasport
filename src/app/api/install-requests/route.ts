import type { InstallRequest } from "@/types";
import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  insertInstallRequest,
  upsertUser,
} from "@/lib/db";
import { notifyAdminNewInstallRequest } from "@/lib/telegram-notify";

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as { request?: InstallRequest };
    if (!body.request?.id || body.request.kind !== "install_request") {
      return Response.json(
        { error: "Некорректные данные заявки" },
        { status: 400 },
      );
    }

    const item = await insertInstallRequest(user.telegramId, body.request);

    // Must await: Vercel freezes the function after the response is sent.
    try {
      await notifyAdminNewInstallRequest(item, user.telegramId);
    } catch (error) {
      console.error("Failed to notify admin about install request", error);
    }

    return Response.json({ request: item }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
