import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getPanelQuota,
  upsertUser,
} from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);
    const quota = await getPanelQuota(user.telegramId);
    return Response.json({ quota });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
