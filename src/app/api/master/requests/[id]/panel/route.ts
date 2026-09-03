import type { PanelWire } from "@/types";
import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  completeMasterWiringCheck,
  dbErrorResponse,
  ensureSchema,
  getPanelForMasterRequest,
  getUserRole,
  updateMasterRequestPanelWires,
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const role = await getUserRole(user.telegramId);
    if (role !== "master") {
      return Response.json({ error: "Не мастер" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      wires?: unknown;
      action?: "save" | "send";
    };
    if (!Array.isArray(body.wires)) {
      return Response.json(
        { error: "Нужен массив wires" },
        { status: 400 },
      );
    }

    const wires = body.wires as PanelWire[];
    if (body.action === "send") {
      if (wires.length === 0) {
        return Response.json(
          { error: "Сначала сохраните расключение" },
          { status: 400 },
        );
      }
      const result = await completeMasterWiringCheck(
        user.telegramId,
        id,
        wires,
      );
      if (!result) {
        return Response.json({ error: "Щиток не найден" }, { status: 404 });
      }
      return Response.json(result);
    }

    const panel = await updateMasterRequestPanelWires(
      user.telegramId,
      id,
      wires,
    );
    if (!panel) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }
    return Response.json({ panel });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
