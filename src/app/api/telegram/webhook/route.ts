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
  sendResearchSurveyInvite,
  sendTelegramMessage,
} from "@/lib/telegram-notify";
import {
  isResearchSurveyStartParam,
} from "@/lib/research-survey-access";
import { parseTelegramStartCommand } from "@/lib/research-survey";
import { installStatusLabels } from "@/types";
import { notifyUserWebPush } from "@/lib/web-push";

type TelegramUpdate = {
  message?: {
    chat: { id: number; type?: string };
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

function verifySecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return true;
  const got = request.headers.get("x-telegram-bot-api-secret-token");
  return got === expected;
}

async function dismissCallback(callbackQueryId: string): Promise<boolean> {
  try {
    await answerCallbackQuery(callbackQueryId);
    return true;
  } catch (error) {
    console.error("answerCallbackQuery failed", error);
    return false;
  }
}

export async function POST(request: Request) {
  let callbackQueryId: string | undefined;
  let callbackAnswered = false;

  try {
    if (!verifySecret(request)) {
      console.error(
        "telegram webhook: unauthorized — check TELEGRAM_WEBHOOK_SECRET and re-run /api/telegram/setup-webhook",
      );
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = (await request.json()) as TelegramUpdate;

    const startPayload = parseTelegramStartCommand(update.message?.text);
    if (
      startPayload &&
      isResearchSurveyStartParam(startPayload) &&
      update.message?.chat.id &&
      update.message.chat.type !== "group" &&
      update.message.chat.type !== "supergroup"
    ) {
      await sendResearchSurveyInvite(update.message.chat.id);
      return Response.json({ ok: true });
    }

    const callback = update.callback_query;
    if (!callback?.id) {
      return Response.json({ ok: true });
    }

    callbackQueryId = callback.id;
    callbackAnswered = await dismissCallback(callback.id);

    await ensureSchema();
    const data = callback.data ?? "";

    // ── Admin: approve master ──
    const approveMaster = parseApproveMasterCallback(data);
    if (approveMaster) {
      if (!(await isPlatformAdmin(callback.from?.id ?? 0))) {
        if (callback.message) {
          await sendTelegramMessage(
            callback.message.chat.id,
            "Недостаточно прав",
          );
        }
        return Response.json({ ok: true });
      }
      await setUserRole(approveMaster.telegramUserId, "master");
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
      const chatId = callback.message?.chat.id;

      if (!masterTelegramId || !chatId) {
        return Response.json({ ok: true });
      }

      const result = await acceptInstallRequest(
        acceptRequest.requestId,
        masterTelegramId,
      );

      if (result === "not_master") {
        await sendTelegramMessage(
          chatId,
          "Нет доступа: вы не зарегистрированы как мастер.",
        );
        return Response.json({ ok: true });
      }

      if (result === "not_found") {
        await sendTelegramMessage(chatId, "Заявка не найдена.");
        return Response.json({ ok: true });
      }

      if (result === "already_taken") {
        if (callback.message) {
          await notifyMasterRequestTaken(chatId, callback.message.message_id);
        }
        await sendTelegramMessage(
          chatId,
          "Заявку уже принял другой мастер.",
        );
        return Response.json({ ok: true });
      }

      if (callback.message) {
        const baseText = callback.message.text ?? "Новая заявка";
        try {
          await editMessageText({
            chatId,
            messageId: callback.message.message_id,
            text: `${baseText}\n\n✅ Вы приняли эту заявку`,
            requestId: acceptRequest.requestId,
            withStatusKeyboard: false,
          });
        } catch (error) {
          console.error("edit accepted request message failed", error);
        }
      }

      try {
        const existing = await getInstallRequestById(acceptRequest.requestId);
        if (existing) {
          await notifyMasterRequestAccepted(
            masterTelegramId,
            existing,
            existing.name,
          );
          await notifyUserWebPush(existing.telegramUserId, {
            title: "Током",
            body: "Мастер принял вашу заявку и скоро свяжется",
            url: "/",
          });
        }

        const dispatched = await getDispatchMessages(acceptRequest.requestId);
        for (const msg of dispatched) {
          if (msg.masterTelegramId === masterTelegramId) continue;
          try {
            await notifyMasterRequestTaken(msg.chatId, msg.messageId);
          } catch {
            // other master message may already be edited
          }
        }
      } catch (error) {
        console.error("accept request follow-up notify error", error);
      }

      return Response.json({ ok: true });
    }

    // ── Admin: status change ──
    if (!(await isPlatformAdmin(callback.from?.id ?? 0))) {
      console.warn("telegram callback ignored for non-admin", {
        data,
        userId: callback.from?.id,
      });
      if (callback.message) {
        await sendTelegramMessage(
          callback.message.chat.id,
          "Недостаточно прав",
        );
      }
      return Response.json({ ok: true });
    }

    const parsed = parseStatusCallback(data);
    if (!parsed) {
      if (callback.message) {
        await sendTelegramMessage(
          callback.message.chat.id,
          "Неизвестная команда",
        );
      }
      return Response.json({ ok: true });
    }

    const existing = await getInstallRequestById(parsed.requestId);
    if (!existing) {
      if (callback.message) {
        await sendTelegramMessage(callback.message.chat.id, "Заявка не найдена");
      }
      return Response.json({ ok: true });
    }

    const updated = await adminUpdateInstallRequest(parsed.requestId, {
      status: parsed.status,
      statusLabel: installStatusLabels[parsed.status],
    });

    if (!updated) {
      if (callback.message) {
        await sendTelegramMessage(
          callback.message.chat.id,
          "Не удалось обновить",
        );
      }
      return Response.json({ ok: true });
    }

    await notifyUserWebPush(existing.telegramUserId, {
      title: "Током",
      body: `Статус заявки: ${installStatusLabels[parsed.status]}`,
      url: "/",
    });

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
    if (callbackQueryId && !callbackAnswered) {
      await dismissCallback(callbackQueryId);
    }
    return Response.json({ ok: true });
  }
}
