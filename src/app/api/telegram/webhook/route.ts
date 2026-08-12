import {
  adminUpdateInstallRequest,
  ensureSchema,
  getInstallRequestById,
} from "@/lib/db";
import {
  answerCallbackQuery,
  editMessageText,
  parseStatusCallback,
} from "@/lib/telegram-notify";
import { installStatusLabels } from "@/types";

type TelegramUpdate = {
  callback_query?: {
    id: string;
    from?: { id: number };
    data?: string;
    message?: {
      message_id: number;
      chat: { id: number };
      text?: string;
    };
  };
};

function isAdmin(userId: number | undefined): boolean {
  const admin = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!admin || userId == null) return false;
  return String(userId) === admin;
}

function verifySecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return true;
  const got = request.headers.get("x-telegram-bot-api-secret-token");
  return got === expected;
}

export async function POST(request: Request) {
  try {
    if (!verifySecret(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = (await request.json()) as TelegramUpdate;
    const callback = update.callback_query;
    if (!callback?.id) {
      return Response.json({ ok: true });
    }

    if (!isAdmin(callback.from?.id)) {
      await answerCallbackQuery(callback.id, "Недостаточно прав");
      return Response.json({ ok: true });
    }

    const parsed = parseStatusCallback(callback.data ?? "");
    if (!parsed) {
      await answerCallbackQuery(callback.id, "Неизвестная команда");
      return Response.json({ ok: true });
    }

    await ensureSchema();
    const existing = await getInstallRequestById(parsed.requestId);
    if (!existing) {
      await answerCallbackQuery(callback.id, "Заявка не найдена");
      return Response.json({ ok: true });
    }

    const updated = await adminUpdateInstallRequest(parsed.requestId, {
      status: parsed.status,
      statusLabel: installStatusLabels[parsed.status],
    });

    if (!updated) {
      await answerCallbackQuery(callback.id, "Не удалось обновить");
      return Response.json({ ok: true });
    }

    await answerCallbackQuery(
      callback.id,
      `Статус: ${installStatusLabels[parsed.status]}`,
    );

    if (callback.message) {
      const baseText = callback.message.text ?? "";
      const nextText = baseText.replace(
        /^Статус: .+$/m,
        `Статус: ${installStatusLabels[parsed.status]}`,
      );
      const text =
        nextText === baseText
          ? `${baseText}\n\n✅ Статус обновлён: ${installStatusLabels[parsed.status]}`
          : nextText;

      await editMessageText({
        chatId: callback.message.chat.id,
        messageId: callback.message.message_id,
        text,
        requestId: parsed.requestId,
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("telegram webhook error", error);
    return Response.json({ ok: true });
  }
}
