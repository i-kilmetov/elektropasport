import { resolveAppOrigin } from "@/lib/app-url";
import { setTelegramWebhook } from "@/lib/telegram-notify";

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

  const origin = resolveAppOrigin(request);
  const webhookUrl = `${origin}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  const result = await setTelegramWebhook(webhookUrl, secret);
  if (!result.ok) {
    return Response.json(
      {
        error: "Не удалось вызвать setWebhook — проверьте BOT_TOKEN",
        details: result.error,
      },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    webhookUrl,
    secretConfigured: Boolean(secret),
  });
}
