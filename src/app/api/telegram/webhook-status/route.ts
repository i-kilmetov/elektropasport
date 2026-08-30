import { productionWebhookOrigin } from "@/lib/app-url";
import { listMasterTelegramIdsForDispatch } from "@/lib/db";
import { getTelegramWebhookInfo } from "@/lib/telegram-notify";

/**
 * Webhook diagnostics — last delivery errors, registered masters count.
 * https://tokom.ru/api/telegram/webhook-status?key=YOUR_SETUP_KEY
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key")?.trim() ?? "";
  const expected = process.env.TELEGRAM_SETUP_KEY?.trim();

  if (!expected || key !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookInfo = await getTelegramWebhookInfo();
  const masterIds = await listMasterTelegramIdsForDispatch();
  const canonicalWebhookUrl = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
    ? `${productionWebhookOrigin()}/api/telegram/hook/${encodeURIComponent(process.env.TELEGRAM_WEBHOOK_SECRET.trim())}`
    : `${productionWebhookOrigin()}/api/telegram/webhook`;

  return Response.json({
    ok: webhookInfo.ok,
    webhookInfo,
    canonicalWebhookUrl,
    mastersRegistered: masterIds.length,
    masterStorageIds: masterIds,
    secretConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim()),
    botTokenConfigured: Boolean(process.env.BOT_TOKEN?.trim()),
    hint:
      webhookInfo.url && webhookInfo.url !== canonicalWebhookUrl
        ? `Webhook в Telegram (${webhookInfo.url}) не совпадает с ожидаемым (${canonicalWebhookUrl}). Откройте /api/telegram/setup-webhook?key=...`
        : webhookInfo.lastErrorMessage
          ? `Telegram ошибка доставки: ${webhookInfo.lastErrorMessage}`
          : "Создайте новую заявку и нажмите «Принять» в сообщении «🔌 Новая заявка».",
  });
}
