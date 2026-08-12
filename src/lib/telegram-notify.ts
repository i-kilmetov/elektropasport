import type { InstallRequest, InstallRequestStatus } from "@/types";
import { installStatusLabels } from "@/types";
import { getBotToken } from "@/lib/telegram-auth";

type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

function adminChatId(): string | null {
  const raw = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!raw) return null;
  // Allow pasting values like "Id: 123456789" from @userinfobot
  const digits = raw.replace(/[^\d-]/g, "");
  return digits || null;
}

type TelegramApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function telegramApi<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramApiResult<T>> {
  const token = getBotToken();
  if (!token) {
    return { ok: false, error: "BOT_TOKEN missing" };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    ok: boolean;
    description?: string;
    result?: T;
  };

  if (!data.ok) {
    const error = data.description ?? `Telegram ${method} failed`;
    console.error(`Telegram ${method} failed:`, error);
    return { ok: false, error };
  }
  return { ok: true, data: (data.result as T) ?? (data as T) };
}

function statusKeyboard(requestId: string): InlineKeyboard {
  const row = (statuses: InstallRequestStatus[]) =>
    statuses.map((status) => ({
      text: installStatusLabels[status],
      callback_data: `st:${requestId}:${status}`.slice(0, 64),
    }));

  return {
    inline_keyboard: [
      row(["new", "in_progress"]),
      row(["done", "cancelled"]),
    ],
  };
}

function formatInstallRequestMessage(
  request: InstallRequest,
  customerTelegramId: number,
): string {
  const contact =
    request.contactMethod === "telegram"
      ? `Telegram · ${request.name}`
      : `Телефон · ${request.phone ?? "—"}`;

  const lines = [
    "🔌 Новая заявка на установку щитка",
    "",
    `Статус: ${request.statusLabel}`,
    `Имя: ${request.name}`,
    `Контакт: ${contact}`,
    `Город: ${request.city}`,
    request.exactAddress ? `Адрес: ${request.exactAddress}` : null,
    request.dwelling
      ? `Объект: ${request.dwelling === "house" ? "Дом" : "Квартира"}`
      : null,
    request.phases ? `Фаз: ${request.phases}` : null,
    request.powerKw ? `Мощность: ${request.powerKw} кВт` : null,
    request.setupTitle ? `Схема: ${request.setupTitle}` : null,
    `Дата: ${request.createdAt}`,
    `ID заявки: ${request.id}`,
    `Telegram user id: ${customerTelegramId}`,
    "",
    "Нажмите кнопку ниже, чтобы сменить статус.",
  ];

  return lines.filter((line) => line !== null).join("\n");
}

export async function notifyAdminNewInstallRequest(
  request: InstallRequest,
  customerTelegramId: number,
): Promise<void> {
  const chatId = adminChatId();
  if (!chatId) {
    console.warn("TELEGRAM_ADMIN_CHAT_ID not set — skip lead notification");
    return;
  }

  const result = await telegramApi("sendMessage", {
    chat_id: Number(chatId),
    text: formatInstallRequestMessage(request, customerTelegramId),
    reply_markup: statusKeyboard(request.id),
    disable_web_page_preview: true,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function notifyAdminMasterApplication(payload: {
  id: string;
  city: string;
  contactMethod: "phone" | "telegram";
  phone?: string;
  name: string;
  customerTelegramId: number;
}): Promise<void> {
  const chatId = adminChatId();
  if (!chatId) return;

  const contact =
    payload.contactMethod === "telegram"
      ? `Telegram · ${payload.name}`
      : `Телефон · ${payload.phone ?? "—"}`;

  const result = await telegramApi("sendMessage", {
    chat_id: Number(chatId),
    text: [
      "🛠️ Заявка «Стать мастером»",
      "",
      `Имя: ${payload.name}`,
      `Контакт: ${contact}`,
      `Город: ${payload.city}`,
      `Telegram user id: ${payload.customerTelegramId}`,
      `ID: ${payload.id}`,
    ].join("\n"),
    disable_web_page_preview: true,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text: string,
): Promise<void> {
  await telegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

export async function editMessageText(params: {
  chatId: number | string;
  messageId: number;
  text: string;
  requestId: string;
}): Promise<void> {
  await telegramApi("editMessageText", {
    chat_id: params.chatId,
    message_id: params.messageId,
    text: params.text,
    reply_markup: statusKeyboard(params.requestId),
    disable_web_page_preview: true,
  });
}

export function parseStatusCallback(
  data: string,
): { requestId: string; status: InstallRequestStatus } | null {
  // st:<requestId>:<status>
  if (!data.startsWith("st:")) return null;
  const parts = data.split(":");
  if (parts.length < 3) return null;
  const status = parts[parts.length - 1] as InstallRequestStatus;
  const requestId = parts.slice(1, -1).join(":");
  if (
    status !== "new" &&
    status !== "in_progress" &&
    status !== "done" &&
    status !== "cancelled"
  ) {
    return null;
  }
  if (!requestId) return null;
  return { requestId, status };
}

export async function setTelegramWebhook(url: string, secret?: string) {
  return telegramApi("setWebhook", {
    url,
    secret_token: secret || undefined,
    allowed_updates: ["callback_query", "message"],
    drop_pending_updates: true,
  });
}

export async function sendAdminTestMessage(): Promise<{
  ok: boolean;
  error?: string;
  chatId?: string;
  botTokenConfigured: boolean;
  adminChatConfigured: boolean;
}> {
  const botTokenConfigured = Boolean(getBotToken());
  const chatId = adminChatId();
  const adminChatConfigured = Boolean(chatId);

  if (!botTokenConfigured) {
    return {
      ok: false,
      error: "BOT_TOKEN не задан",
      botTokenConfigured,
      adminChatConfigured,
    };
  }
  if (!chatId) {
    return {
      ok: false,
      error: "TELEGRAM_ADMIN_CHAT_ID не задан или пустой",
      botTokenConfigured,
      adminChatConfigured,
    };
  }

  const result = await telegramApi("sendMessage", {
    chat_id: Number(chatId),
    text: "✅ Тест Электропаспорт: бот может писать вам. Если это сообщение пришло — уведомления о заявках тоже будут.",
    disable_web_page_preview: true,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      chatId,
      botTokenConfigured,
      adminChatConfigured,
    };
  }

  return {
    ok: true,
    chatId,
    botTokenConfigured,
    adminChatConfigured,
  };
}
