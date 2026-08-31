import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getPanelByOwner,
  getPanelPhoto,
  upsertPanelPhoto,
  upsertUser,
} from "@/lib/db";
import { MAX_PANEL_PHOTO_BYTES } from "@/lib/panel-photo";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id: panelId } = await context.params;
    const panel = await getPanelByOwner(user.telegramId, panelId);
    if (!panel) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }

    const photo = await getPanelPhoto(user.telegramId, panelId);
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id: panelId } = await context.params;
    const panel = await getPanelByOwner(user.telegramId, panelId);
    if (!panel) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return Response.json({ error: "Файл не найден" }, { status: 400 });
    }
    if (file.size > MAX_PANEL_PHOTO_BYTES) {
      return Response.json(
        { error: "Файл слишком большой (сжимаем до 3,5 МБ)" },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    await upsertPanelPhoto({
      ownerTelegramId: user.telegramId,
      panelId,
      mime: file.type || "image/jpeg",
      bytes,
    });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
