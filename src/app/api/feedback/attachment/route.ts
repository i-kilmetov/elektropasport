import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import { dbErrorResponse, ensureSchema, upsertUser } from "@/lib/db";
import { notifyAdminFeedbackAttachment } from "@/lib/telegram-notify";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return Response.json({ error: "Файл не найден" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: "Файл слишком большой (макс. 15 МБ)" },
        { status: 400 },
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const filename =
      file.name?.trim() ||
      (mimeType.startsWith("image/") ? "photo.jpg" : "attachment.bin");

    await notifyAdminFeedbackAttachment({
      file,
      filename,
      mimeType,
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
