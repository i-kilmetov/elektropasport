import { authErrorResponse } from "@/lib/telegram-auth";
import { dbErrorResponse } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { adminSetUserRole } from "@/lib/admin-db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const telegramId = Number(id);
    const body = (await request.json()) as { role?: "user" | "master" };
    if (!Number.isFinite(telegramId) || (body.role !== "user" && body.role !== "master")) {
      return Response.json({ error: "Некорректные данные" }, { status: 400 });
    }
    await adminSetUserRole(telegramId, body.role);
    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
