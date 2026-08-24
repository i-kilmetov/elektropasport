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
    const db = dbErrorResponse(error);
    if (db) return db;
    if (error instanceof Error && error.name !== "AuthError") {
      console.error("GET /api/items", error);
      return Response.json(
        { error: error.message || "Не удалось загрузить данные" },
        { status: 500 },
      );
    }
    return authErrorResponse(error);
  }
}
