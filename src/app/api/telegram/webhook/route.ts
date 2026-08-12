import {
  adminUpdateInstallRequest,
  ensureSchema,
  getInstallRequestById,
  upsertUser,
} from "@/lib/db";
import {
  completeBrowserAuthSession,
  parseWebAuthStartCode,
} from "@/lib/browser-auth-sessions";
import {
  answerCallbackQuery,
  editMessageText,
  parseStatusCallback,
  sendTelegramChatMessage,
} from "@/lib/telegram-notify";
import { installStatusLabels } from "@/types";

type TelegramUpdate = {
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: { id: number };
    text?: string;
  };
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

async function handleWebAuthStart(update: TelegramUpdate): Promise<boolean> {
  const message = update.message;
  const startCode = parseWebAuthStartCode(message?.text);
  if (!startCode || !message?.from?.id) return false;

  await ensureSchema();
  await upsertUser({
    telegramId: message.from.id,
    firstName: message.from.first_name,
    lastName: message.from.last_name,
    username: message.from.username,
  });

  const ok = await completeBrowserAuthSession(startCode, {
    telegramId: message.from.id,
    firstName: message.from.first_name,
    lastName: message.from.last_name,
    username: message.from.username,
  });

  await sendTelegramChatMessage(
    message.chat.id,
    ok
      ? "✅ Вход подтверждён. Вернитесь в браузер — страница обновится автоматически."
      : "Ссылка для входа устарела или уже использована. Запросите новую на сайте.",
  );

  return true;
}

export async function POST(request: Request) {
  try {
    if (!verifySecret(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = (await request.json()) as TelegramUpdate;

    if (await handleWebAuthStart(update)) {
      return Response.json({ ok: true });
    }

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
