import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  deleteAppliancePassportPhoto,
  ensureSchema,
  getAppliancePassportPhoto,
  upsertUser,
} from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id } = await context.params;
    const photo = await getAppliancePassportPhoto(user.telegramId, id);
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

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id } = await context.params;
    const deleted = await deleteAppliancePassportPhoto(user.telegramId, id);
    if (!deleted) {
      return Response.json({ error: "Фото не найдено" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
