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
import {
  buildPanelShareUrl,
  type PanelShareScope,
} from "@/lib/panel-share";
import { resolveRequestOrigin } from "@/lib/app-url";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id } = await context.params;
    const panel = await getPanelByOwner(user.telegramId, id);
    if (!panel) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }

    let scope: PanelShareScope = "full";
    try {
      const body = (await request.json()) as { scope?: string };
      if (body.scope === "scheme") scope = "scheme";
    } catch {
      // empty body — full card
    }

    const token = await createOrGetPanelShare(user.telegramId, id);
    return Response.json({
      token,
      url: buildPanelShareUrl(token, resolveRequestOrigin(request), scope),
    });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
