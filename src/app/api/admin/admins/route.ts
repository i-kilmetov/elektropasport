import { authErrorResponse } from "@/lib/telegram-auth";
import { dbErrorResponse } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { setUserAdminFlag } from "@/lib/admin-db";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = (await request.json()) as { telegramId?: number | string };
    const telegramId = Number(body.telegramId);
    if (!Number.isFinite(telegramId) || telegramId <= 0) {
      return Response.json({ error: "Укажите Telegram ID" }, { status: 400 });
    }
    await setUserAdminFlag(telegramId, true);
    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
