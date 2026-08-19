import { authErrorResponse } from "@/lib/telegram-auth";
import { dbErrorResponse } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { setUserAdminFlag } from "@/lib/admin-db";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const telegramId = Number(id);
    if (!Number.isFinite(telegramId)) {
      return Response.json({ error: "Некорректный id" }, { status: 400 });
    }
    await setUserAdminFlag(telegramId, false);
    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
