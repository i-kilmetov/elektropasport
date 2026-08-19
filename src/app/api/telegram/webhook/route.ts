import {
  adminUpdateInstallRequest,
  ensureSchema,
  getInstallRequestById,
  setUserRole,
  acceptInstallRequest,
  getDispatchMessages,
} from "@/lib/db";
import { isPlatformAdmin } from "@/lib/admin";
import {
  answerCallbackQuery,
  editMessageText,
  parseStatusCallback,
  parseApproveMasterCallback,
  parseAcceptRequestCallback,
  notifyMasterRequestAccepted,
  notifyMasterRequestTaken,
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

    await ensureSchema();
    const data = callback.data ?? "";

    // ── Admin: approve master ──
    const approveMaster = parseApproveMasterCallback(data);
    if (approveMaster) {
      if (!(await isPlatformAdmin(callback.from?.id ?? 0))) {
        await answerCallbackQuery(callback.id, "Недостаточно прав");
        return Response.json({ ok: true });
      }
      await setUserRole(approveMaster.telegramUserId, "master");
      await answerCallbackQuery(callback.id, "Пользователь стал мастером ✅");
      if (callback.message) {
        const baseText = callback.message.text ?? "";
        await editMessageText({
          chatId: callback.message.chat.id,
          messageId: callback.message.message_id,
          text: `${baseText}\n\n✅ Пользователь одобрен как мастер`,
          requestId: "",
          withStatusKeyboard: false,
        });
      }
      return Response.json({ ok: true });
    }

    // ── Master: accept request ──
    const acceptRequest = parseAcceptRequestCallback(data);
    if (acceptRequest) {
      const masterTelegramId = callback.from?.id;
      if (!masterTelegramId) {
        await answerCallbackQuery(callback.id, "Ошибка авторизации");
        return Response.json({ ok: true });
      }

      const result = await acceptInstallRequest(
        acceptRequest.requestId,
        masterTelegramId,
      );

      if (result === "not_found") {
        await answerCallbackQuery(callback.id, "Заявка не найдена");
        return Response.json({ ok: true });
      }

      if (result === "already_taken") {
        await answerCallbackQuery(callback.id, "Заявку уже принял другой мастер");
        if (callback.message) {
          await notifyMasterRequestTaken(
            callback.message.chat.id,
            callback.message.message_id,
          );
        }
        return Response.json({ ok: true });
      }

      // result === "accepted"
      await answerCallbackQuery(callback.id, "Вы приняли заявку! ✅");

      const existing = await getInstallRequestById(acceptRequest.requestId);
      if (existing) {
        await notifyMasterRequestAccepted(
          masterTelegramId,
          existing,
          existing.name,
        );
      }

      // Notify all other masters that the request is taken
      const dispatched = await getDispatchMessages(acceptRequest.requestId);
      for (const msg of dispatched) {
        if (msg.masterTelegramId === masterTelegramId) continue;
        try {
          await notifyMasterRequestTaken(msg.chatId, msg.messageId);
        } catch {
          // other master message may already be edited
        }
      }

      return Response.json({ ok: true });
    }

    // ── Admin: status change ──
    if (!(await isPlatformAdmin(callback.from?.id ?? 0))) {
      await answerCallbackQuery(callback.id, "Недостаточно прав");
      return Response.json({ ok: true });
    }

    const parsed = parseStatusCallback(data);
    if (!parsed) {
      await answerCallbackQuery(callback.id, "Неизвестная команда");
      return Response.json({ ok: true });
    }

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
