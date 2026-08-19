import { authErrorResponse, requireTelegramUser } from "@/lib/telegram-auth";
import { dbErrorResponse, ensureSchema, upsertUser } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/admin";

export async function GET(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);
    const isAdmin = await isPlatformAdmin(user.telegramId);
    return Response.json({ isAdmin });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
