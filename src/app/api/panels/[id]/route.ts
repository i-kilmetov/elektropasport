import type { HomeAppliance, PanelObject } from "@/types";
import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  deletePanel,
  ensureSchema,
  getPanelByOwner,
  updatePanel,
  upsertUser,
} from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id } = await context.params;
    const panel = await getPanelByOwner(user.telegramId, id);
    if (!panel) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }
    return Response.json({ panel });
  } catch (error) {
    const db = dbErrorResponse(error);
    if (db) return db;
    if (error instanceof Error && error.name === "AuthError") {
      return authErrorResponse(error);
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/panels/[id]", msg, error);
    return Response.json({ error: msg }, { status: 500 });
  }
}

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
        | "appliances"
        | "appliancesUpdatedAt"
        | "devices"
        | "wires"
        | "breakers"
        | "linesCount"
        | "railCount"
        | "lastCheck"
      >
    >;

    if (body.appliances !== undefined && !Array.isArray(body.appliances)) {
      return Response.json({ error: "Некорректный список техники" }, { status: 400 });
    }

    const appliances = Array.isArray(body.appliances)
      ? (body.appliances as HomeAppliance[]).map((item) => ({
          ...item,
          photoDataUrl: undefined,
        }))
      : undefined;

    const panel = await updatePanel(user.telegramId, id, {
      ...body,
      ...(appliances !== undefined
        ? {
            appliances,
            appliancesUpdatedAt:
              typeof body.appliancesUpdatedAt === "string" &&
              body.appliancesUpdatedAt.trim()
                ? body.appliancesUpdatedAt
                : new Date().toISOString(),
          }
        : {}),
    });
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
    const result = await deletePanel(user.telegramId, id);
    if (!result.ok) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }
    return Response.json({
      ok: true,
      markedRequestIds: result.markedRequestIds,
    });
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
