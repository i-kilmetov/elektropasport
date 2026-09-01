import type { AppEnv } from "@/lib/app-env";
import { toStorageTelegramId } from "@/lib/app-env";

/** Reserved band for phone-only accounts (real Telegram ids are much smaller). */
export const PHONE_AUTH_ID_BASE = 9_000_000_000_000;

export function normalizeRuPhoneDigits(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.startsWith("7")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length !== 10) return null;
  return digits;
}

export function ruPhoneToE164(digits: string): string {
  return `+7${digits}`;
}

export function phoneAuthStorageId(phoneDigits: string, env: AppEnv): number {
  const n = Number(phoneDigits);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Некорректный номер телефона");
  }
  const base = PHONE_AUTH_ID_BASE + n;
  return toStorageTelegramId(base, env);
}

export function isPhoneAuthStorageId(storageId: number): boolean {
  const abs = Math.abs(storageId);
  return (
    abs >= PHONE_AUTH_ID_BASE &&
    abs < PHONE_AUTH_ID_BASE + 10_000_000_000
  );
}

export function isTelegramGatewayConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_GATEWAY_TOKEN?.trim());
}

export function isBrowserLoginEnabled(): boolean {
  return isTelegramGatewayConfigured();
}
