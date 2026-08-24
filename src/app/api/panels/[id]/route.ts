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
        | "title"
        | "named"
        | "address"
        | "safety"
        | "phases"
        | "powerKw"
        | "hasGround"
        | "houseSnapshot"
      >
    >;

    const panel = await updatePanel(user.telegramId, id, body);
    if (!panel) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }
    return Response.json({ panel });
  } catch (error) {
    const db = dbErrorResponse(error);
    if (db) return db;
    const msg = error instanceof Error ? error.message : String(error);
    console.error("PATCH /api/panels/[id]", msg, error);
    if (error instanceof Error && error.name === "AuthError") {
      return authErrorResponse(error);
    }
    return Response.json({ error: `Ошибка сохранения: ${msg}` }, { status: 500 });
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
    const db = dbErrorResponse(error);
    if (db) return db;
    const msg = error instanceof Error ? error.message : String(error);
    console.error("DELETE /api/panels/[id]", msg, error);
    if (error instanceof Error && error.name === "AuthError") {
      return authErrorResponse(error);
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
