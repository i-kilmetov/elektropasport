import { productionWebhookOrigin } from "@/lib/app-url";

/** Canonical webhook URL for the current BOT_TOKEN (www, secret in path). */
export function buildTelegramWebhookUrl(): string {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const origin = productionWebhookOrigin();
  if (!secret) {
    return `${origin}/api/telegram/webhook`;
  }
  return `${origin}/api/telegram/hook/${encodeURIComponent(secret)}`;
}

export function telegramWebhookNeedsRepair(info: {
  url?: string;
  lastErrorMessage?: string;
}): boolean {
  const expected = buildTelegramWebhookUrl();
  if (!info.url || info.url !== expected) return true;
  if (info.lastErrorMessage) return true;
  return false;
}
