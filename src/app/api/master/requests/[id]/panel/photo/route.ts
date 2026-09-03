import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getPanelForMasterRequest,
  getPanelPhotoByPanelId,
  getUserRole,
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

    const photo = await getPanelPhotoByPanelId(panel.id);
    if (!photo) {
      return Response.json({ error: "Фото не найдено" }, { status: 404 });
    }

    return new Response(new Uint8Array(photo.bytes), {
      headers: {
        "Content-Type": photo.mime || "image/jpeg",
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
