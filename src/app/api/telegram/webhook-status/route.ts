import { listMasterTelegramIdsForDispatch } from "@/lib/db";
import {
  ensureTelegramWebhook,
  getTelegramBotMe,
  getTelegramWebhookInfo,
} from "@/lib/telegram-notify";
import { buildTelegramWebhookUrl } from "@/lib/telegram-webhook-config";

/**
 * Webhook diagnostics — bot identity, URL match, delivery errors.
 * https://tokom.ru/api/telegram/webhook-status?key=YOUR_SETUP_KEY
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key")?.trim() ?? "";
  const expected = process.env.TELEGRAM_SETUP_KEY?.trim();

  if (!expected || key !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bot = await getTelegramBotMe();
  const webhookInfo = await getTelegramWebhookInfo();
  const masterIds = await listMasterTelegramIdsForDispatch();
  const canonicalWebhookUrl = buildTelegramWebhookUrl();

  return Response.json({
    ok: webhookInfo.ok,
    bot: bot
      ? {
          id: bot.id,
          username: bot.username,
          expected: "tokomrobot",
          matchesExpectedBot: bot.username === "tokomrobot",
        }
      : null,
    webhookInfo,
    canonicalWebhookUrl,
    webhookMatches: webhookInfo.url === canonicalWebhookUrl,
    mastersRegistered: masterIds.length,
    masterStorageIds: masterIds,
    secretConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim()),
    botTokenConfigured: Boolean(process.env.BOT_TOKEN?.trim()),
    hint: !bot
      ? "BOT_TOKEN не работает."
      : bot.username !== "tokomrobot"
        ? `BOT_TOKEN — это @${bot.username}, не @tokomrobot. Замените токен в Vercel.`
        : webhookInfo.url !== canonicalWebhookUrl
          ? `Webhook: ${webhookInfo.url ?? "не задан"}. Нужен: ${canonicalWebhookUrl}. Откройте setup-webhook или создайте заявку (auto-repair).`
          : webhookInfo.lastErrorMessage
            ? `Telegram: ${webhookInfo.lastErrorMessage}`
            : "OK — создайте новую заявку и нажмите «Принять» в «🔌 Новая заявка».",
  });
}
