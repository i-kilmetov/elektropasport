import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import { dbErrorResponse, ensureSchema, upsertUser } from "@/lib/db";
import { notifyAdminMasterEducationPhoto } from "@/lib/telegram-notify";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const form = await request.formData();
    const file = form.get("file");
    const applicationId = String(form.get("applicationId") ?? "").trim();
    const name = String(form.get("name") ?? "").trim() || "кандидат";
    const index = Number(form.get("index") ?? 0);
    const total = Number(form.get("total") ?? 0);

    if (!(file instanceof File) || file.size <= 0 || !applicationId) {
      return Response.json({ error: "Файл не найден" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: "Файл слишком большой (макс. 4 МБ)" },
        { status: 400 },
      );
    }

    const filename = file.name?.trim() || "education.jpg";
    await notifyAdminMasterEducationPhoto({
      applicationId,
      name,
      file,
      filename,
      index: Number.isFinite(index) ? index : 1,
      total: Number.isFinite(total) ? total : 1,
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
