import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  createOrGetPanelShare,
  dbErrorResponse,
  ensureSchema,
  getPanelByOwner,
  upsertUser,
} from "@/lib/db";
import { buildPanelShareUrl } from "@/lib/panel-share";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(_request);
    await ensureSchema();
    await upsertUser(user);

    const { id } = await context.params;
    const panel = await getPanelByOwner(user.telegramId, id);
    if (!panel) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }

    const token = await createOrGetPanelShare(user.telegramId, id);
    return Response.json({
      token,
      url: buildPanelShareUrl(token),
    });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
