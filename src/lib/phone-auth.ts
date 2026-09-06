import { createHmac, randomInt, timingSafeEqual } from "crypto";
import type { AppEnv } from "@/lib/app-env";
import { toStorageTelegramId } from "@/lib/app-env";

/** Reserved band for phone-only accounts (real Telegram ids are much smaller). */
export const PHONE_AUTH_ID_BASE = 9_000_000_000_000;

const LOCAL_OTP_PREFIX = "bototp:";

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

/**
 * Temporary allowlist for Telegram Gateway phone login (national 10 digits).
 * Other numbers get a soft “code not delivered” stub until Gateway is opened wider.
 */
export const PHONE_AUTH_ALLOWLIST_DIGITS = "9653012157";

export const PHONE_CODE_NOT_DELIVERED_MESSAGE =
  "Код не доставлен. Попробуйте войти через Telegram.";

export function isPhoneAuthAllowlisted(phoneDigits: string): boolean {
  return phoneDigits === PHONE_AUTH_ALLOWLIST_DIGITS;
}

function localOtpPepper(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.BOT_TOKEN?.trim() ||
    "phone-otp"
  );
}

/** 6-digit OTP used when Gateway is unreachable from the host. */
export function generateLocalPhoneOtp(): string {
  return String(randomInt(100_000, 1_000_000));
}

export function isLocalPhoneOtpRequestId(requestId: string): boolean {
  return requestId.startsWith(LOCAL_OTP_PREFIX);
}

export function localPhoneOtpRequestId(
  challengeId: string,
  code: string,
): string {
  const digest = createHmac("sha256", localOtpPepper())
    .update(`${challengeId}:${code.trim()}`)
    .digest("hex");
  return `${LOCAL_OTP_PREFIX}${digest}`;
}

export function verifyLocalPhoneOtp(
  challengeId: string,
  requestId: string,
  code: string,
): boolean {
  if (!isLocalPhoneOtpRequestId(requestId)) return false;
  const expected = Buffer.from(
    localPhoneOtpRequestId(challengeId, code),
    "utf8",
  );
  const actual = Buffer.from(requestId, "utf8");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
