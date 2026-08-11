import type { PanelObject } from "@/types";
import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  insertPanel,
  upsertUser,
} from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as { panel?: PanelObject };
    if (!body.panel?.id || body.panel.kind !== "panel") {
      return Response.json({ error: "Некорректные данные щитка" }, { status: 400 });
    }

    const panel = await insertPanel(user.telegramId, body.panel);
    return Response.json({ panel }, { status: 201 });
  } catch (error) {
    const db = dbErrorResponse(error);
    if (db) return db;
    if (error instanceof Error && !(error.name === "AuthError")) {
      console.error("POST /api/panels", error);
      return Response.json(
        { error: error.message || "Не удалось сохранить щиток" },
        { status: 500 },
      );
    }
    return authErrorResponse(error);
  }
}
