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
    const msg =
      error instanceof Error ? error.message : String(error);
    const name =
      error instanceof Error ? error.name : "Unknown";
    console.error("GET /api/items", name, msg, error);
    if (error instanceof Error && error.name === "AuthError") {
      return authErrorResponse(error);
    }
    return Response.json(
      { error: `${name}: ${msg}` },
      { status: 500 },
    );
  }
}
