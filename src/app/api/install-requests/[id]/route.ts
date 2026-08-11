import type { InstallRequest } from "@/types";
import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  deleteInstallRequest,
  ensureSchema,
  updateInstallRequest,
  upsertUser,
} from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id } = await context.params;
    const body = (await request.json()) as Partial<Pick<InstallRequest, "title">>;
    const item = await updateInstallRequest(user.telegramId, id, body);
    if (!item) {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }
    return Response.json({ request: item });
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
    const ok = await deleteInstallRequest(user.telegramId, id);
    if (!ok) {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
