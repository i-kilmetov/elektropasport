import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getSharedPanel,
  upsertUser,
} from "@/lib/db";
import { isPanelShareToken } from "@/lib/panel-share";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { token } = await context.params;
    if (!isPanelShareToken(token)) {
      return Response.json({ error: "Ссылка недействительна" }, { status: 400 });
    }

    const shared = await getSharedPanel(token);
    if (!shared) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }

    return Response.json({
      panel: shared.panel,
      isOwner: shared.ownerTelegramId === user.telegramId,
    });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
