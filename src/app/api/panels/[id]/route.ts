import type { PanelObject } from "@/types";
import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  deletePanel,
  ensureSchema,
  updatePanel,
  upsertUser,
} from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id } = await context.params;
    const body = (await request.json()) as Partial<
      Pick<
        PanelObject,
        "title" | "named" | "address" | "safety" | "phases" | "powerKw" | "hasGround"
      >
    >;

    const panel = await updatePanel(user.telegramId, id, body);
    if (!panel) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }
    return Response.json({ panel });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id } = await context.params;
    const ok = await deletePanel(user.telegramId, id);
    if (!ok) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
