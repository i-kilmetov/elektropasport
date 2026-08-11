import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  listHomeItems,
  upsertUser,
} from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);
    const items = await listHomeItems(user.telegramId);
    return Response.json({ items });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
