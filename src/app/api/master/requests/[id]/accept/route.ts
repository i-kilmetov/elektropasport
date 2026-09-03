import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  acceptInstallRequest,
  dbErrorResponse,
  ensureSchema,
  getInstallRequestById,
  getUserRole,
  upsertUser,
} from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const role = await getUserRole(user.telegramId);
    if (role !== "master") {
      return Response.json({ error: "Не мастер" }, { status: 403 });
    }

    const { id } = await context.params;
    const result = await acceptInstallRequest(id, user.telegramId);
    if (result === "not_found") {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }
    if (result === "not_master") {
      return Response.json({ error: "Не мастер" }, { status: 403 });
    }
    if (result === "already_taken") {
      return Response.json(
        { error: "Заявку уже принял другой мастер" },
        { status: 409 },
      );
    }

    const accepted = await getInstallRequestById(id);
    if (!accepted) {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }
    const { telegramUserId: _owner, ...requestItem } = accepted;
    return Response.json({ request: requestItem, ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
