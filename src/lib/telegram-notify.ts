import type { InstallRequest, InstallRequestStatus } from "@/types";
import { installStatusLabels } from "@/types";
import { PRODUCTION_APP_URL } from "@/lib/app-url";
import { getBotToken } from "@/lib/telegram-auth";
import { dedupeMasterStorageIds, toTelegramChatId } from "@/lib/app-env";
import { listAdminTelegramIds, ownerAdminTelegramId } from "@/lib/admin";
import {
  buildTelegramWebhookUrl,
  telegramWebhookNeedsRepair,
} from "@/lib/telegram-webhook-config";

type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

function adminChatId(): string | null {
  const id = ownerAdminTelegramId();
  return id != null ? String(id) : null;
}

async function sendToAdmins(
  body: Record<string, unknown>,
): Promise<void> {
  const ids = await listAdminTelegramIds();
  if (ids.length === 0) {
    console.warn("No admin chat ids — skip notification");
    return;
  }
  let lastError: string | null = null;
  for (const chatId of ids) {
    const result = await telegramApi("sendMessage", {
      ...body,
      chat_id: chatId,
    });
    if (!result.ok) lastError = result.error;
  }
  if (lastError && ids.length === 1) {
    throw new Error(lastError);
  }
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
  extras?: {
    username?: string;
    botCanMessage?: boolean;
    headline?: string;
    footer?: string;
  },
): string {
  const contact =
    request.contactMethod === "telegram"
      ? "Telegram, если закрыты сообщения — звонок"
      : `Телефон · ${request.phone ?? "—"}`;

  const username = extras?.username?.replace(/^@/, "");
  const botCanMessage = extras?.botCanMessage;

  const lines = [
    extras?.headline ?? "🔌 Новая заявка на установку щитка",
    "",
    request.publicCode ? `Номер: ${request.publicCode}` : null,
    `Статус: ${request.statusLabel}`,
    `Имя: ${request.name}`,
    `Контакт: ${contact}`,
    request.phone ? `Телефон: ${request.phone}` : null,
    request.city && request.city !== "—" ? `Город: ${request.city}` : null,
    request.exactAddress ? `Адрес: ${request.exactAddress}` : null,
    request.dwelling
      ? `Объект: ${request.dwelling === "house" ? "Дом" : "Квартира"}`
      : null,
    request.phases ? `Фаз: ${request.phases}` : null,
    request.powerKw ? `Мощность: ${request.powerKw} кВт` : null,
    request.setupTitle ? `Схема: ${request.setupTitle}` : null,
    request.paymentStatus === "confirmed" && request.paidAmountRub
      ? `Оплата СБП: ${request.paidAmountRub.toLocaleString("ru-RU")} ₽ ✅`
      : request.paymentStatus === "confirmed"
        ? "Оплата СБП: получена ✅"
        : null,
    `Дата: ${request.createdAt}`,
    `ID заявки: ${request.id}`,
    `Telegram user id: ${customerTelegramId}`,
    username ? `Username: @${username}` : null,
    username ? `Профиль: https://t.me/${username}` : null,
    request.contactMethod === "telegram"
      ? botCanMessage
        ? "Бот может писать пользователю ✅"
        : "Бот не может писать — звоните на телефон ⚠️"
      : null,
    "",
    extras?.footer ?? "Нажмите кнопку ниже, чтобы сменить статус.",
  ];

  return lines.filter((line) => line !== null).join("\n");
}

async function sendAdminInstallRequestMessage(params: {
  request: InstallRequest;
  customerTelegramId: number;
  extras?: {
    username?: string;
    botCanMessage?: boolean;
    headline?: string;
    footer?: string;
  };
  withStatusKeyboard: boolean;
}): Promise<void> {
  await sendToAdmins({
    text: formatInstallRequestMessage(
      params.request,
      params.customerTelegramId,
      params.extras,
    ),
    reply_markup: params.withStatusKeyboard
      ? statusKeyboard(params.request.id)
      : undefined,
    disable_web_page_preview: true,
  });
}

export async function sendTelegramUserMessage(
  chatId: number,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await telegramApi<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

export async function sendResearchSurveyInvite(chatId: number): Promise<void> {
  const url = `${PRODUCTION_APP_URL}/research`;
  const result = await telegramApi("sendMessage", {
    chat_id: chatId,
    text: "Короткий опрос про электрику дома. Ответы анонимно идут в исследование Токома.",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [{ text: "Пройти анкету", web_app: { url } }],
      ],
    },
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
}

/** Probe whether the bot can DM this user (user must have started the bot). */
export async function canBotMessageUser(chatId: number): Promise<boolean> {
  const result = await sendTelegramUserMessage(
    chatId,
    "Заявка получена. Мы скоро свяжемся с вами здесь в Telegram.",
  );
  return result.ok;
}

export async function notifyAdminNewInstallRequest(
  request: InstallRequest,
  customerTelegramId: number,
  extras?: {
    username?: string;
    botCanMessage?: boolean;
  },
): Promise<void> {
  await sendAdminInstallRequestMessage({
    request,
    customerTelegramId,
    extras,
    withStatusKeyboard: true,
  });
}

/** User deleted the request in the app — cancelled, no status controls. */
export async function notifyAdminInstallRequestDeletedByUser(
  request: InstallRequest,
  customerTelegramId: number,
  extras?: { username?: string },
): Promise<void> {
  await sendAdminInstallRequestMessage({
    request: {
      ...request,
      status: "cancelled",
      statusLabel: installStatusLabels.cancelled,
    },
    customerTelegramId,
    extras: {
      ...extras,
      headline: "🗑 Пользователь удалил заявку",
      footer:
        "Статус: Отменена. Управление статусом недоступно — заявка удалена пользователем.",
    },
    withStatusKeyboard: false,
  });
}

/** User changed status in the app (e.g. restored after admin cancel). */
export async function notifyAdminInstallRequestStatusChangedByUser(
  request: InstallRequest,
  customerTelegramId: number,
  extras?: { username?: string },
): Promise<void> {
  await sendAdminInstallRequestMessage({
    request,
    customerTelegramId,
    extras: {
      ...extras,
      headline: `🔄 Пользователь сменил статус: ${request.statusLabel}`,
      footer: "Нажмите кнопку ниже, чтобы сменить статус.",
    },
    withStatusKeyboard: true,
  });
}

export async function notifyAdminMasterApplication(payload: {
  id: string;
  city: string;
  about?: string;
  contactMethod: "phone" | "telegram";
  phone?: string;
  name: string;
  customerTelegramId: number;
  educationDocsCount?: number;
  examScore?: number;
  examTotal?: number;
  examGrade?: number;
}): Promise<void> {
  const contact =
    payload.contactMethod === "telegram"
      ? `Telegram · ${payload.name}`
      : `Телефон · ${payload.phone ?? "—"}`;

  const about = payload.about?.trim();
  const exam =
    payload.examScore != null &&
    payload.examTotal != null &&
    payload.examGrade != null
      ? `Экзамен 3 класса: ${payload.examScore} из ${payload.examTotal}, оценка ${payload.examGrade}`
      : null;
  const docs =
    payload.educationDocsCount != null
      ? `Документов об образовании: ${payload.educationDocsCount}`
      : null;

  await sendToAdmins({
    text: [
      "🛠️ Заявка «Стать мастером»",
      "",
      `Имя: ${payload.name}`,
      `Контакт: ${contact}`,
      `Город: ${payload.city}`,
      `Telegram user id: ${payload.customerTelegramId}`,
      `ID: ${payload.id}`,
      ...(exam ? [exam] : []),
      ...(docs ? [docs] : []),
      ...(about ? ["", "О себе:", about] : []),
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [[{
        text: "✅ Сделать мастером",
        callback_data: `approve_master:${payload.customerTelegramId}`.slice(0, 64),
      }]],
    },
    disable_web_page_preview: true,
  });
}

export async function notifyAdminMasterEducationPhoto(payload: {
  applicationId: string;
  name: string;
  file: Blob;
  filename: string;
  index: number;
  total: number;
}): Promise<void> {
  const ids = await listAdminTelegramIds();
  if (ids.length === 0) {
    console.warn("No admin chat ids — skip education photo");
    return;
  }

  const caption = `Документ ${payload.index}/${payload.total} · ${payload.name} · ${payload.applicationId}`;

  for (const chatId of ids) {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("photo", payload.file, payload.filename);
    form.append("caption", caption.slice(0, 1024));
    const result = await telegramApiForm("sendPhoto", form);
    if (!result.ok) {
      console.error("Failed to send master education photo", result.error);
    }
  }
}

/** Send a request to all master Telegram chats with Accept button. */
export async function dispatchRequestToMasters(
  masterChatIds: number[],
  request: InstallRequest,
  customerName: string,
): Promise<Array<{ chatId: number; messageId: number; masterTelegramId: number }>> {
  const addressNoApt = request.exactAddress
    ?.replace(/,?\s*(кв|квартира|apt)\.?\s*\d+/i, "")
    ?.trim();

  const text = [
    "🔌 Новая заявка от клиента",
    "",
    request.setupTitle ? `Работа: ${request.setupTitle}` : null,
    request.city ? `Город: ${request.city}` : null,
    addressNoApt ? `Адрес: ${addressNoApt}` : null,
    request.phases ? `Фаз: ${request.phases}` : null,
    request.powerKw ? `Мощность: ${request.powerKw} кВт` : null,
    request.paidAmountRub
      ? `Стоимость: ${request.paidAmountRub.toLocaleString("ru-RU")} ₽`
      : null,
    "",
    "Нажмите «Принять», чтобы взять заявку.",
  ].filter((line) => line !== null).join("\n");

  const results: Array<{
    chatId: number;
    messageId: number;
    masterTelegramId: number;
  }> = [];

  const uniqueStorageIds = dedupeMasterStorageIds(masterChatIds);
  for (const storageId of uniqueStorageIds) {
    const chatId = toTelegramChatId(storageId);
    const callbackToken = request.id;
    const result = await telegramApi<{ message_id: number }>("sendMessage", {
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [[{
          text: "✅ Принять заявку",
          callback_data: buildAcceptRequestCallbackData(callbackToken),
        }]],
      },
      disable_web_page_preview: true,
    });
    if (result.ok) {
      results.push({
        chatId,
        messageId: result.data.message_id,
        masterTelegramId: storageId,
      });
    } else {
      console.error("dispatchRequestToMasters sendMessage failed", {
        chatId,
        storageId,
        error: result.error,
      });
    }
  }
  return results;
}

/** Notify a master that they won the request — send full details. */
export async function notifyMasterRequestAccepted(
  masterChatId: number,
  request: InstallRequest,
  customerName: string,
): Promise<void> {
  const text = [
    "🎉 Вы приняли заявку!",
    "",
    `Клиент: ${customerName}`,
    `Телефон: ${request.phone ?? "—"}`,
    request.exactAddress ? `Адрес: ${request.exactAddress}` : null,
    request.setupTitle ? `Работа: ${request.setupTitle}` : null,
    "",
    "Свяжитесь с клиентом в течение 5 минут.",
  ].filter((line) => line !== null).join("\n");

  await telegramApi("sendMessage", {
    chat_id: masterChatId,
    text,
    disable_web_page_preview: true,
  });
}

/** Tell other masters this request was taken. */
export async function notifyMasterRequestTaken(
  chatId: number,
  messageId: number,
): Promise<void> {
  await telegramApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: "Заявку уже принял другой мастер.",
    reply_markup: { inline_keyboard: [] },
  });
}

/** Parse approve_master callback. */
export function parseApproveMasterCallback(
  data: string,
): { telegramUserId: number } | null {
  if (!data.startsWith("approve_master:")) return null;
  const id = Number(data.slice("approve_master:".length));
  if (!Number.isFinite(id)) return null;
  return { telegramUserId: id };
}

/** Build inline callback token for master accept (max 64 bytes). */
export function buildAcceptRequestCallbackData(token: string): string {
  return `ar:${token}`.slice(0, 64);
}

/** Parse master accept callback (supports legacy accept_request: prefix). */
export function parseAcceptRequestCallback(
  data: string,
): { requestId: string } | null {
  if (data.startsWith("accept_request:")) {
    const requestId = data.slice("accept_request:".length).trim();
    if (requestId) return { requestId };
  }
  if (data.startsWith("ar:")) {
    const requestId = data.slice(3).trim();
    if (requestId) return { requestId };
  }
  return null;
}

const FEEDBACK_TOPIC_LABELS: Record<string, string> = {
  bugs: "Ошибки",
  tips: "Рекомендации",
  other: "Другое",
};

async function telegramApiForm(
  method: string,
  form: FormData,
): Promise<TelegramApiResult<unknown>> {
  const token = getBotToken();
  if (!token) {
    return { ok: false, error: "BOT_TOKEN missing" };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    body: form,
  });

  const data = (await res.json()) as {
    ok: boolean;
    description?: string;
    result?: unknown;
  };

  if (!data.ok) {
    const error = data.description ?? `Telegram ${method} failed`;
    console.error(`Telegram ${method} failed:`, error);
    return { ok: false, error };
  }
  return { ok: true, data: data.result };
}

export async function notifyAdminFeedback(payload: {
  message: string;
  topic: "bugs" | "tips" | "other";
  name: string;
  username?: string;
  customerTelegramId: number;
}): Promise<void> {
  if ((await listAdminTelegramIds()).length === 0) {
    throw new Error("TELEGRAM_ADMIN_CHAT_ID не настроен");
  }

  const topicLabel =
    FEEDBACK_TOPIC_LABELS[payload.topic] ?? FEEDBACK_TOPIC_LABELS.other;

  await sendToAdmins({
    text: [
      "💬 Обратная связь",
      "",
      `Тема: ${topicLabel}`,
      `Имя: ${payload.name}`,
      payload.username ? `Username: @${payload.username}` : null,
      `Telegram user id: ${payload.customerTelegramId}`,
      "",
      payload.message,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    disable_web_page_preview: true,
  });
}

export async function notifyAdminResearchSurvey(payload: {
  name: string;
  username?: string;
  customerTelegramId?: number;
  branch: string;
  dwelling: string;
  typology: string;
  need: string;
  manuals?: string;
  helpFirst?: string;
}): Promise<void> {
  if ((await listAdminTelegramIds()).length === 0) return;
  await sendToAdmins({
    text: [
      "📋 Анкета исследования",
      "",
      `Имя: ${payload.name}`,
      payload.username ? `Username: @${payload.username}` : null,
      payload.customerTelegramId
        ? `Telegram user id: ${payload.customerTelegramId}`
        : "Telegram user id: нет",
      `Жильё: ${payload.dwelling}`,
      `Ветка ввода: ${payload.branch}`,
      `Тип: ${payload.typology}`,
      `Инструкции: ${payload.manuals || "—"}`,
      `Помощь: ${payload.helpFirst || "—"}`,
      `Нужен сервис: ${payload.need}`,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    disable_web_page_preview: true,
  });
}

export async function notifyAdminSchoolPurchase(payload: {
  telegramUserId: number;
  gradeId: 1 | 2 | 3 | 4;
  gradeTitle: string;
  amountRub: number;
  orderId: string;
}): Promise<void> {
  await sendToAdmins({
    text: [
      "🎓 Школа Током — оплата класса",
      "",
      `Класс: ${payload.gradeTitle}`,
      `Сумма: ${payload.amountRub.toLocaleString("ru-RU")} ₽`,
      `Заказ: ${payload.orderId}`,
      `Telegram user id: ${payload.telegramUserId}`,
      `Время: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} (МСК)`,
    ].join("\n"),
    disable_web_page_preview: true,
  });
}

export async function notifyAdminWaitlist(payload: {
  list: string;
  email: string;
  telegramUserId?: number | null;
}): Promise<void> {
  const titles: Record<string, string> = {
    launch: "📬 Подписка на открытие Током",
    school: "🎓 Школа Током — заявка с почтой",
    terminals: "🔌 Клеммы и кабели — лист ожидания",
  };
  await sendToAdmins({
    text: [
      titles[payload.list] ?? `📬 Waitlist: ${payload.list}`,
      "",
      payload.email.startsWith("+")
        ? `Телефон: ${payload.email}`
        : `Email: ${payload.email}`,
      payload.telegramUserId
        ? `Telegram user id: ${payload.telegramUserId}`
        : "Telegram user id: нет (анонимно)",
      `Время: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} (МСК)`,
    ].join("\n"),
    disable_web_page_preview: true,
  });
}

export async function notifyAdminLaunchWaitlist(payload: {
  email: string;
}): Promise<void> {
  await notifyAdminWaitlist({ list: "launch", email: payload.email });
}

export async function notifyAdminFeedbackAttachment(payload: {
  file: Blob;
  filename: string;
  mimeType: string;
}): Promise<void> {
  const chatId = adminChatId();
  if (!chatId) {
    throw new Error("TELEGRAM_ADMIN_CHAT_ID не настроен");
  }

  const form = new FormData();
  form.append("chat_id", String(Number(chatId)));
  const isImage = payload.mimeType.startsWith("image/");
  if (isImage) {
    form.append("photo", payload.file, payload.filename);
    const photoResult = await telegramApiForm("sendPhoto", form);
    if (!photoResult.ok) {
      throw new Error(photoResult.error);
    }
    return;
  }

  form.append("document", payload.file, payload.filename);
  const docResult = await telegramApiForm("sendDocument", form);
  if (!docResult.ok) {
    throw new Error(docResult.error);
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false,
): Promise<void> {
  const body: Record<string, unknown> = {
    callback_query_id: callbackQueryId,
  };
  if (text) {
    body.text = text;
    body.show_alert = showAlert;
  }

  const result = await telegramApi("answerCallbackQuery", body);
  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function getTelegramWebhookInfo(): Promise<{
  ok: boolean;
  url?: string;
  hasCustomCertificate?: boolean;
  pendingUpdateCount?: number;
  lastErrorDate?: number;
  lastErrorMessage?: string;
  maxConnections?: number;
  allowedUpdates?: string[];
  error?: string;
}> {
  const result = await telegramApi<{
    url?: string;
    has_custom_certificate?: boolean;
    pending_update_count?: number;
    last_error_date?: number;
    last_error_message?: string;
    max_connections?: number;
    allowed_updates?: string[];
  }>("getWebhookInfo", {});

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    url: result.data.url,
    hasCustomCertificate: result.data.has_custom_certificate,
    pendingUpdateCount: result.data.pending_update_count,
    lastErrorDate: result.data.last_error_date,
    lastErrorMessage: result.data.last_error_message,
    maxConnections: result.data.max_connections,
    allowedUpdates: result.data.allowed_updates,
  };
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
): Promise<void> {
  const result = await telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function editMessageText(params: {
  chatId: number | string;
  messageId: number;
  text: string;
  requestId: string;
  withStatusKeyboard?: boolean;
}): Promise<void> {
  await telegramApi("editMessageText", {
    chat_id: params.chatId,
    message_id: params.messageId,
    text: params.text,
    reply_markup:
      params.withStatusKeyboard === false
        ? { inline_keyboard: [] }
        : statusKeyboard(params.requestId),
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

export async function getTelegramBotMe(): Promise<{
  id: number;
  username: string;
  firstName: string;
} | null> {
  const result = await telegramApi<{
    id: number;
    username?: string;
    first_name?: string;
  }>("getMe", {});
  if (!result.ok) return null;
  return {
    id: result.data.id,
    username: result.data.username ?? "",
    firstName: result.data.first_name ?? "",
  };
}

/** Re-register webhook if URL drifted (common after BOT_TOKEN / bot migration). */
export async function ensureTelegramWebhook(): Promise<{
  ok: boolean;
  wasUpdated: boolean;
  webhookUrl: string;
  botUsername?: string;
  botId?: number;
  previousUrl?: string;
  lastError?: string;
  error?: string;
}> {
  const webhookUrl = buildTelegramWebhookUrl();
  if (!getBotToken()) {
    return { ok: false, wasUpdated: false, webhookUrl, error: "BOT_TOKEN missing" };
  }

  const me = await getTelegramBotMe();
  const info = await getTelegramWebhookInfo();
  const needsRepair = !info.ok || telegramWebhookNeedsRepair(info);

  if (!needsRepair) {
    return {
      ok: true,
      wasUpdated: false,
      webhookUrl,
      botUsername: me?.username,
      botId: me?.id,
    };
  }

  const result = await setTelegramWebhook(webhookUrl);
  const after = await getTelegramWebhookInfo();

  if (!result.ok) {
    return {
      ok: false,
      wasUpdated: false,
      webhookUrl,
      botUsername: me?.username,
      botId: me?.id,
      previousUrl: info.url,
      lastError: info.lastErrorMessage ?? result.error,
      error: result.error,
    };
  }

  return {
    ok: true,
    wasUpdated: true,
    webhookUrl,
    botUsername: me?.username,
    botId: me?.id,
    previousUrl: info.url,
    lastError: after.lastErrorMessage,
  };
}

export async function setTelegramWebhook(url: string) {
  // Auth via secret in URL path (/api/telegram/hook/...). Do not set secret_token:
  // redirects/proxies often strip X-Telegram-Bot-Api-Secret-Token → 401.
  return telegramApi("setWebhook", {
    url,
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
    text: "✅ Тест Током: бот может писать вам. Если это сообщение пришло — уведомления о заявках тоже будут.",
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
