import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getPanelForMasterRequest,
  getUserRole,
  upsertUser,
} from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const role = await getUserRole(user.telegramId);
    if (role !== "master") {
      return Response.json({ error: "Не мастер" }, { status: 403 });
    }

    const { id } = await context.params;
    const panel = await getPanelForMasterRequest(user.telegramId, id);
    if (!panel) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }

    return Response.json({ panel });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
