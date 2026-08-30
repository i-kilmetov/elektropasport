import { listMasterTelegramIds } from "@/lib/db";
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
  const masterIds = await listMasterTelegramIds();

  return Response.json({
    ok: webhookInfo.ok,
    webhookInfo,
    mastersRegistered: masterIds.length,
    masterStorageIds: masterIds,
    secretConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim()),
    botTokenConfigured: Boolean(process.env.BOT_TOKEN?.trim()),
    hint:
      webhookInfo.lastErrorMessage
        ? "Telegram не доставляет обновления — исправьте ошибку и перерегистрируйте webhook."
        : "Создайте новую заявку после деплоя и нажмите «Принять» в свежем сообщении бота (не в админском уведомлении).",
  });
}
