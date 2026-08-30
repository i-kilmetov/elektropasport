import {
  adminUpdateInstallRequest,
  ensureSchema,
  getInstallRequestById,
  setUserRole,
  acceptInstallRequest,
  getDispatchMessages,
  resolveInstallRequestId,
  upsertUser,
} from "@/lib/db";
import { isPlatformAdmin } from "@/lib/admin";
import { toTelegramChatId } from "@/lib/app-env";
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
    from?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    data?: string;
    message?: {
      message_id: number;
      chat: { id: number };
      text?: string;
    };
  };
};

async function ackCallback(
  callbackQueryId: string,
  text?: string,
  showAlert = false,
): Promise<boolean> {
  try {
    await answerCallbackQuery(callbackQueryId, text, showAlert);
    return true;
  } catch (error) {
    console.error("answerCallbackQuery failed", error);
    return false;
  }
}

async function notifyChat(
  chatId: number | undefined,
  text: string,
): Promise<void> {
  if (!chatId) return;
  try {
    await sendTelegramMessage(chatId, text);
  } catch (error) {
    console.error("notifyChat failed", { chatId, text, error });
  }
}

export async function handleTelegramWebhook(
  request: Request,
): Promise<Response> {
  let callbackQueryId: string | undefined;
  let callbackAnswered = false;
  let callbackChatId: number | undefined;

  try {
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
    callbackChatId =
      callback.message?.chat.id ?? callback.from?.id;
    callbackAnswered = await ackCallback(callback.id);

    await ensureSchema();
    const data = callback.data ?? "";

    console.info("telegram callback", {
      data,
      userId: callback.from?.id,
      chatId: callbackChatId,
    });

    if (callback.from?.id) {
      await upsertUser({
        telegramId: callback.from.id,
        firstName: callback.from.first_name,
        lastName: callback.from.last_name,
        username: callback.from.username,
      });
    }

    const approveMaster = parseApproveMasterCallback(data);
    if (approveMaster) {
      if (!(await isPlatformAdmin(callback.from?.id ?? 0))) {
        await notifyChat(callbackChatId, "Недостаточно прав");
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

    const acceptRequest = parseAcceptRequestCallback(data);
    if (acceptRequest) {
      const realMasterId = callback.from?.id;
      const chatId = callbackChatId;

      if (!realMasterId || !chatId) {
        console.error("accept callback missing from/chat", { data, callback });
        return Response.json({ ok: true });
      }

      const result = await acceptInstallRequest(
        acceptRequest.requestId,
        realMasterId,
      );

      if (result === "not_master") {
        await notifyChat(
          chatId,
          "Нет доступа: вы не зарегистрированы как мастер. Напишите администратору.",
        );
        return Response.json({ ok: true });
      }

      if (result === "not_found") {
        await notifyChat(
          chatId,
          `Заявка «${acceptRequest.requestId}» не найдена. Создайте новую заявку в приложении.`,
        );
        return Response.json({ ok: true });
      }

      if (result === "already_taken") {
        if (callback.message) {
          await notifyMasterRequestTaken(chatId, callback.message.message_id);
        } else {
          await notifyChat(chatId, "Заявку уже принял другой мастер.");
        }
        return Response.json({ ok: true });
      }

      const resolvedRequestId =
        (await resolveInstallRequestId(acceptRequest.requestId)) ??
        acceptRequest.requestId;

      if (callback.message) {
        const baseText = callback.message.text ?? "Новая заявка";
        await editMessageText({
          chatId,
          messageId: callback.message.message_id,
          text: `${baseText}\n\n✅ Вы приняли эту заявку`,
          requestId: resolvedRequestId,
          withStatusKeyboard: false,
        });
      }

      const existing = await getInstallRequestById(resolvedRequestId);
      if (existing) {
        await notifyMasterRequestAccepted(
          toTelegramChatId(realMasterId),
          existing,
          existing.name,
        );
        await notifyUserWebPush(existing.telegramUserId, {
          title: "Током",
          body: "Мастер принял вашу заявку и скоро свяжется",
          url: "/",
        });
      }

      const dispatched = await getDispatchMessages(resolvedRequestId);
      for (const msg of dispatched) {
        if (Math.abs(msg.masterTelegramId) === Math.abs(realMasterId)) {
          continue;
        }
        try {
          await notifyMasterRequestTaken(msg.chatId, msg.messageId);
        } catch {
          // other master message may already be edited
        }
      }

      await notifyChat(chatId, "✅ Заявка принята. Детали отправлены выше.");
      return Response.json({ ok: true });
    }

    if (!(await isPlatformAdmin(callback.from?.id ?? 0))) {
      console.warn("telegram callback ignored for non-admin", {
        data,
        userId: callback.from?.id,
      });
      await notifyChat(
        callbackChatId,
        `Неизвестная кнопка (${data || "пусто"}).`,
      );
      return Response.json({ ok: true });
    }

    const parsed = parseStatusCallback(data);
    if (!parsed) {
      await notifyChat(callbackChatId, "Неизвестная команда");
      return Response.json({ ok: true });
    }

    const existing = await getInstallRequestById(parsed.requestId);
    if (!existing) {
      await notifyChat(callbackChatId, "Заявка не найдена");
      return Response.json({ ok: true });
    }

    const updated = await adminUpdateInstallRequest(parsed.requestId, {
      status: parsed.status,
      statusLabel: installStatusLabels[parsed.status],
    });

    if (!updated) {
      await notifyChat(callbackChatId, "Не удалось обновить");
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
      await ackCallback(callbackQueryId);
    }
    await notifyChat(
      callbackChatId,
      "Ошибка сервера при обработке кнопки. Попробуйте ещё раз через минуту.",
    );
    return Response.json({ ok: true });
  }
}
