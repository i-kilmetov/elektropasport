import { handleTelegramWebhook } from "@/lib/telegram-webhook-handler";

/**
 * Primary Telegram webhook entry — secret is in the URL path so auth survives
 * redirects and proxies that strip X-Telegram-Bot-Api-Secret-Token.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ secret: string }> },
) {
  const { secret } = await context.params;
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (expected && secret !== expected) {
    console.error("telegram hook: path secret mismatch");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleTelegramWebhook(request);
}
