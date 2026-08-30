import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  countAppliancePassportPhotos,
  dbErrorResponse,
  ensureSchema,
  getPanelByOwner,
  insertAppliancePassportPhoto,
  listAppliancePassportPhotos,
  upsertUser,
} from "@/lib/db";
import {
  MAX_APPLIANCE_PASSPORT_BYTES,
  MAX_APPLIANCE_PASSPORT_PHOTOS,
} from "@/lib/appliance-passport";

export async function GET(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const url = new URL(request.url);
    const panelId = url.searchParams.get("panelId")?.trim() ?? "";
    const applianceId = url.searchParams.get("applianceId")?.trim() ?? "";
    if (!panelId || !applianceId) {
      return Response.json({ error: "Не указана техника" }, { status: 400 });
    }

    const panel = await getPanelByOwner(user.telegramId, panelId);
    if (!panel) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }

    const photos = await listAppliancePassportPhotos(
      user.telegramId,
      panelId,
      applianceId,
    );
    return Response.json({ photos });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const form = await request.formData();
    const file = form.get("file");
    const panelId = String(form.get("panelId") ?? "").trim();
    const applianceId = String(form.get("applianceId") ?? "").trim();

    if (!(file instanceof File) || file.size <= 0 || !panelId || !applianceId) {
      return Response.json({ error: "Файл не найден" }, { status: 400 });
    }
    if (file.size > MAX_APPLIANCE_PASSPORT_BYTES) {
      return Response.json(
        { error: "Файл слишком большой (сжимаем до 3,5 МБ)" },
        { status: 400 },
      );
    }

    const panel = await getPanelByOwner(user.telegramId, panelId);
    if (!panel) {
      return Response.json({ error: "Щиток не найден" }, { status: 404 });
    }

    const existing = await countAppliancePassportPhotos(
      user.telegramId,
      panelId,
      applianceId,
    );
    if (existing >= MAX_APPLIANCE_PASSPORT_PHOTOS) {
      return Response.json(
        { error: `Можно приложить не больше ${MAX_APPLIANCE_PASSPORT_PHOTOS} фото` },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const photo = await insertAppliancePassportPhoto({
      ownerTelegramId: user.telegramId,
      panelId,
      applianceId,
      mime: "image/jpeg",
      bytes,
    });
    return Response.json({ photo }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
