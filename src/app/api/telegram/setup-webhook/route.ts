import {
  ensureTelegramWebhook,
  getTelegramBotMe,
  getTelegramWebhookInfo,
} from "@/lib/telegram-notify";
import { buildTelegramWebhookUrl } from "@/lib/telegram-webhook-config";

/**
 * One-time setup: open this URL after deploy (with secret) to register the webhook.
 * Example:
 * https://tokom.ru/api/telegram/setup-webhook?key=YOUR_SETUP_KEY
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key")?.trim() ?? "";
  const expected = process.env.TELEGRAM_SETUP_KEY?.trim();

  if (!expected) {
    return Response.json(
      {
        error: "TELEGRAM_SETUP_KEY не задан на сервере",
        hint: "Добавьте переменную в Vercel → Settings → Environment Variables (Production) и сделайте Redeploy",
      },
      { status: 401 },
    );
  }

  if (!key || key !== expected) {
    return Response.json(
      {
        error: "Неверный key в URL",
        hint: "Значение ?key=... должно точно совпадать с TELEGRAM_SETUP_KEY (без кавычек и пробелов)",
      },
      { status: 401 },
    );
  }

  const webhookUrl = buildTelegramWebhookUrl();
  const repair = await ensureTelegramWebhook();
  const info = await getTelegramWebhookInfo();
  const bot = await getTelegramBotMe();

  if (!repair.ok) {
    return Response.json(
      {
        error: "Не удалось вызвать setWebhook — проверьте BOT_TOKEN",
        details: repair.error,
        bot,
        webhookInfo: info,
        expectedWebhookUrl: webhookUrl,
      },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    webhookUrl,
    bot: bot
      ? {
          id: bot.id,
          username: bot.username,
          expected: "tokomrobot",
          matchesExpectedBot: bot.username === "tokomrobot",
        }
      : null,
    secretConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim()),
    webhookInfo: info,
    webhookMatches: info.url === webhookUrl,
    webhookRepaired: repair.wasUpdated,
    previousWebhookUrl: repair.previousUrl ?? null,
    lastWebhookError: info.lastErrorMessage ?? null,
    hint: !bot
      ? "BOT_TOKEN не работает — проверьте токен @tokomrobot в Vercel."
      : bot.username !== "tokomrobot"
        ? `BOT_TOKEN указывает на @${bot.username}, а не @tokomrobot. Обновите BOT_TOKEN в Vercel.`
        : !info.url || info.url !== webhookUrl
          ? `Webhook перерегистрирован. Создайте новую заявку и нажмите «Принять».`
          : info.lastErrorMessage
            ? `Telegram ошибка: ${info.lastErrorMessage}`
            : "Webhook OK. Создайте новую заявку и нажмите «Принять» в сообщении «🔌 Новая заявка».",
  });
}
