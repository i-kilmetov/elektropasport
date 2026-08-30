import { handleTelegramWebhook } from "@/lib/telegram-webhook-handler";

function verifySecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return true;
  const fromHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (fromHeader === expected) return true;
  const fromQuery = new URL(request.url).searchParams.get("token");
  return fromQuery === expected;
}

export async function POST(request: Request) {
  if (!verifySecret(request)) {
    console.error(
      "telegram webhook: unauthorized — re-run /api/telegram/setup-webhook",
    );
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleTelegramWebhook(request);
}
